// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IERC721 {
    function ownerOf(uint256 tokenId) external view returns (address);
}

contract SmartEscrow {
    enum EscrowStatus { Active, Completed, Refunded }
    enum EscrowType { Conditional, Scheduled, Recurring }

    // Reentrancy guard
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;
    uint256 private _status;

    struct Escrow {
        uint256 id;
        address payable sender;
        address payable receiver;
        address token; // address(0) for native ETH
        uint256 amount;
        string condition;
        uint256 deadline;
        EscrowStatus status;
        EscrowType escrowType;
        uint256 interval; // for recurring: seconds between payouts
        address conditionTarget; // NFT contract or oracle target address
        uint256 conditionTokenId; // NFT tokenId to check, or 0
    }

    uint256 public nextEscrowId;
    address public oracle;
    address public executor; // authorized address that can trigger scheduled releases
    mapping(uint256 => Escrow) public escrows;
    mapping(uint256 => uint256) public lastRecurringExecution; // escrowId => last execution timestamp

    event EscrowCreated(
        uint256 indexed id,
        address indexed sender,
        address indexed receiver,
        address token,
        uint256 amount,
        string condition,
        uint256 deadline
    );
    event EscrowReleased(uint256 indexed id, address indexed receiver, uint256 amount);
    event EscrowRefunded(uint256 indexed id, address indexed sender, uint256 amount);
    event OracleUpdated(address indexed oldOracle, address indexed newOracle);
    event ExecutorUpdated(address indexed oldExecutor, address indexed newExecutor);

    modifier onlyOracle() {
        require(msg.sender == oracle, "Only oracle can perform this action");
        _;
    }

    modifier onlySender(uint256 _id) {
        require(msg.sender == escrows[_id].sender, "Only sender can perform this action");
        _;
    }

    modifier onlyExecutorOrOracle() {
        require(msg.sender == executor || msg.sender == oracle, "Only executor or oracle");
        _;
    }

    modifier nonReentrant() {
        require(_status != ENTERED, "ReentrancyGuard: reentrant call");
        _status = ENTERED;
        _;
        _status = NOT_ENTERED;
    }

    constructor(address _oracle) {
        require(_oracle != address(0), "Oracle address cannot be zero");
        oracle = _oracle;
        executor = _oracle; // default executor = oracle
        _status = NOT_ENTERED;
        emit OracleUpdated(address(0), _oracle);
    }

    function createEscrow(
        address payable _receiver,
        address _token,
        uint256 _amount,
        string calldata _condition,
        uint256 _duration
    ) external payable returns (uint256) {
        return _createEscrowInternal(_receiver, _token, _amount, _condition, _duration, EscrowType.Conditional, 0, address(0), 0);
    }

    function createScheduledEscrow(
        address payable _receiver,
        address _token,
        uint256 _amount,
        string calldata _condition,
        uint256 _releaseTimestamp
    ) external payable returns (uint256) {
        require(_releaseTimestamp > block.timestamp, "Release time must be in the future");
        uint256 duration = _releaseTimestamp - block.timestamp;
        return _createEscrowInternal(_receiver, _token, _amount, _condition, duration, EscrowType.Scheduled, 0, address(0), 0);
    }

    function createRecurringEscrow(
        address payable _receiver,
        address _token,
        uint256 _amount,
        string calldata _condition,
        uint256 _interval,
        uint256 _duration
    ) external payable returns (uint256) {
        require(_interval > 0, "Interval must be > 0");
        return _createEscrowInternal(_receiver, _token, _amount, _condition, _duration, EscrowType.Recurring, _interval, address(0), 0);
    }

    function createNFTConditionalEscrow(
        address payable _receiver,
        address _token,
        uint256 _amount,
        string calldata _condition,
        uint256 _duration,
        address _nftContract,
        uint256 _tokenId
    ) external payable returns (uint256) {
        require(_nftContract != address(0), "NFT contract required");
        return _createEscrowInternal(_receiver, _token, _amount, _condition, _duration, EscrowType.Conditional, 0, _nftContract, _tokenId);
    }

    function _createEscrowInternal(
        address payable _receiver,
        address _token,
        uint256 _amount,
        string calldata _condition,
        uint256 _duration,
        EscrowType _escrowType,
        uint256 _interval,
        address _conditionTarget,
        uint256 _conditionTokenId
    ) internal returns (uint256) {
        require(_receiver != address(0), "Receiver cannot be zero address");
        require(_receiver != msg.sender, "Sender cannot be receiver");
        require(_amount > 0, "Amount must be greater than zero");

        uint256 escrowId = nextEscrowId++;
        uint256 deadline = _duration > 0 ? block.timestamp + _duration : block.timestamp + 365 days;

        if (_token == address(0)) {
            require(msg.value == _amount, "Incorrect ETH value sent");
        } else {
            require(msg.value == 0, "Do not send ETH when locking ERC20 tokens");
            require(
                IERC20(_token).transferFrom(msg.sender, address(this), _amount),
                "Token transfer failed"
            );
        }

        escrows[escrowId] = Escrow({
            id: escrowId,
            sender: payable(msg.sender),
            receiver: _receiver,
            token: _token,
            amount: _amount,
            condition: _condition,
            deadline: deadline,
            status: EscrowStatus.Active,
            escrowType: _escrowType,
            interval: _interval,
            conditionTarget: _conditionTarget,
            conditionTokenId: _conditionTokenId
        });

        emit EscrowCreated(escrowId, msg.sender, _receiver, _token, _amount, _condition, deadline);

        return escrowId;
    }

    function release(uint256 _id) external nonReentrant {
        Escrow storage escrow = escrows[_id];
        require(escrow.status == EscrowStatus.Active, "Escrow is not active");
        require(
            msg.sender == escrow.sender || msg.sender == oracle,
            "Only sender or oracle can release funds"
        );

        _releaseEscrow(_id);
    }

    function refund(uint256 _id) external nonReentrant {
        Escrow storage escrow = escrows[_id];
        require(escrow.status == EscrowStatus.Active, "Escrow is not active");

        if (msg.sender == oracle) {
            // Oracle can trigger refund at any time
        } else if (msg.sender == escrow.sender) {
            require(block.timestamp >= escrow.deadline, "Deadline has not passed yet");
        } else {
            revert("Only sender (after deadline) or oracle can refund");
        }

        _refundEscrow(_id);
    }

    function resolveEscrow(uint256 _id, bool _release) external onlyOracle nonReentrant {
        if (_release) {
            _releaseEscrow(_id);
        } else {
            _refundEscrow(_id);
        }
    }

    function executeScheduledRelease(uint256 _id) external onlyExecutorOrOracle nonReentrant {
        Escrow storage escrow = escrows[_id];
        require(escrow.status == EscrowStatus.Active, "Escrow is not active");
        require(escrow.escrowType == EscrowType.Scheduled, "Not a scheduled escrow");
        require(block.timestamp >= escrow.deadline, "Scheduled time not reached");

        _releaseEscrow(_id);
    }

    function executeRecurringPayout(uint256 _id) external onlyExecutorOrOracle nonReentrant {
        Escrow storage escrow = escrows[_id];
        require(escrow.status == EscrowStatus.Active, "Escrow is not active");
        require(escrow.escrowType == EscrowType.Recurring, "Not a recurring escrow");

        uint256 lastExec = lastRecurringExecution[_id];
        require(
            lastExec == 0 || block.timestamp >= lastExec + escrow.interval,
            "Interval not yet elapsed"
        );
        require(block.timestamp < escrow.deadline, "Recurring period expired");

        lastRecurringExecution[_id] = block.timestamp;

        if (escrow.token == address(0)) {
            (bool success, ) = escrow.receiver.call{value: escrow.amount}("");
            require(success, "ETH transfer failed");
        } else {
            require(
                IERC20(escrow.token).transfer(escrow.receiver, escrow.amount),
                "Token transfer failed"
            );
        }

        emit EscrowReleased(_id, escrow.receiver, escrow.amount);
    }

    function verifyNFTCondition(uint256 _id) external view returns (bool) {
        Escrow storage escrow = escrows[_id];
        if (escrow.conditionTarget == address(0)) return false;
        try IERC721(escrow.conditionTarget).ownerOf(escrow.conditionTokenId) returns (address owner) {
            return owner == escrow.receiver;
        } catch {
            return false;
        }
    }

    function _releaseEscrow(uint256 _id) internal {
        Escrow storage escrow = escrows[_id];
        require(escrow.status == EscrowStatus.Active, "Escrow is not active");
        escrow.status = EscrowStatus.Completed;

        if (escrow.token == address(0)) {
            (bool success, ) = escrow.receiver.call{value: escrow.amount}("");
            require(success, "ETH transfer failed");
        } else {
            require(
                IERC20(escrow.token).transfer(escrow.receiver, escrow.amount),
                "Token transfer failed"
            );
        }

        emit EscrowReleased(_id, escrow.receiver, escrow.amount);
    }

    function _refundEscrow(uint256 _id) internal {
        Escrow storage escrow = escrows[_id];
        require(escrow.status == EscrowStatus.Active, "Escrow is not active");
        escrow.status = EscrowStatus.Refunded;

        if (escrow.token == address(0)) {
            (bool success, ) = escrow.sender.call{value: escrow.amount}("");
            require(success, "ETH transfer failed");
        } else {
            require(
                IERC20(escrow.token).transfer(escrow.sender, escrow.amount),
                "Token transfer failed"
            );
        }

        emit EscrowRefunded(_id, escrow.sender, escrow.amount);
    }

    function getEscrow(uint256 _id) external view returns (Escrow memory) {
        return escrows[_id];
    }

    function updateOracle(address _newOracle) external onlyOracle {
        require(_newOracle != address(0), "Oracle address cannot be zero");
        address oldOracle = oracle;
        oracle = _newOracle;
        emit OracleUpdated(oldOracle, _newOracle);
    }

    function updateExecutor(address _newExecutor) external onlyOracle {
        require(_newExecutor != address(0), "Executor address cannot be zero");
        address oldExecutor = executor;
        executor = _newExecutor;
        emit ExecutorUpdated(oldExecutor, _newExecutor);
    }
}
