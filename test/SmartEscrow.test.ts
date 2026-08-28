import assert from "node:assert/strict";
import { describe, it, before, beforeEach } from "node:test";
import { network } from "hardhat";

describe("SmartEscrow", function () {
  let ethers: any;
  let smartEscrow: any;
  let mockToken: any;
  let owner: any;
  let sender: any;
  let receiver: any;
  let oracle: any;
  let stranger: any;
  let executor: any;

  const duration = 3600;

  before(async function () {
    const conn = await network.connect();
    ethers = conn.ethers;
  });

  beforeEach(async function () {
    const conn = await network.connect();
    ethers = conn.ethers;
    [owner, sender, receiver, oracle, stranger, executor] = await ethers.getSigners();

    const SmartEscrowFactory = await ethers.getContractFactory("SmartEscrow");
    smartEscrow = await SmartEscrowFactory.deploy(oracle.address);
    await smartEscrow.waitForDeployment();

    const MockTokenFactory = await ethers.getContractFactory("MockToken");
    mockToken = await MockTokenFactory.deploy(ethers.parseEther("10000.0"));
    await mockToken.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct oracle address", async function () {
      assert.equal(await smartEscrow.oracle(), oracle.address);
    });

    it("Should set oracle as initial executor", async function () {
      assert.equal(await smartEscrow.executor(), oracle.address);
    });
  });

  describe("Admin Functions", function () {
    it("Should update oracle address", async function () {
      await (await smartEscrow.connect(oracle).updateOracle(stranger.address)).wait();
      assert.equal(await smartEscrow.oracle(), stranger.address);
    });

    it("Should update executor address", async function () {
      await (await smartEscrow.connect(oracle).updateExecutor(executor.address)).wait();
      assert.equal(await smartEscrow.executor(), executor.address);
    });

    it("Should reject non-oracle updating oracle", async function () {
      await assert.rejects(
        smartEscrow.connect(stranger).updateOracle(stranger.address),
        /Only oracle can perform this action/
      );
    });
  });

  describe("ETH Escrow - Create", function () {
    it("Should create an ETH escrow successfully", async function () {
      const amount = ethers.parseEther("1.0");
      const tx = await smartEscrow.connect(sender).createEscrow(
        receiver.address, ethers.ZeroAddress, amount, "Release after delivery", duration,
        { value: amount }
      );
      await tx.wait();
      const escrow = await smartEscrow.getEscrow(0);
      assert.equal(escrow.sender, sender.address);
      assert.equal(escrow.receiver, receiver.address);
      assert.equal(escrow.amount, amount);
      assert.equal(Number(escrow.status), 0);
    });

    it("Should reject wrong ETH value", async function () {
      const amount = ethers.parseEther("1.0");
      await assert.rejects(
        smartEscrow.connect(sender).createEscrow(
          receiver.address, ethers.ZeroAddress, amount, "Test", duration,
          { value: ethers.parseEther("0.5") }
        ),
        /Incorrect ETH value sent/
      );
    });
  });

  describe("ETH Escrow - Release", function () {
    it("Should allow sender to release manually", async function () {
      const amount = ethers.parseEther("1.0");
      await (await smartEscrow.connect(sender).createEscrow(
        receiver.address, ethers.ZeroAddress, amount, "Test", duration,
        { value: amount }
      )).wait();
      await (await smartEscrow.connect(sender).release(0)).wait();
      const escrow = await smartEscrow.getEscrow(0);
      assert.equal(Number(escrow.status), 1);
    });

    it("Should allow oracle to release", async function () {
      const amount = ethers.parseEther("1.0");
      await (await smartEscrow.connect(sender).createEscrow(
        receiver.address, ethers.ZeroAddress, amount, "Test", duration,
        { value: amount }
      )).wait();
      await (await smartEscrow.connect(oracle).release(0)).wait();
      const escrow = await smartEscrow.getEscrow(0);
      assert.equal(Number(escrow.status), 1);
    });

    it("Should reject stranger releasing escrow", async function () {
      const amount = ethers.parseEther("1.0");
      await (await smartEscrow.connect(sender).createEscrow(
        receiver.address, ethers.ZeroAddress, amount, "Test", duration,
        { value: amount }
      )).wait();
      await assert.rejects(
        smartEscrow.connect(stranger).release(0),
        /Only sender or oracle can release funds/
      );
    });
  });

  describe("ETH Escrow - Refund", function () {
    it("Should allow oracle to refund any time", async function () {
      const amount = ethers.parseEther("1.0");
      await (await smartEscrow.connect(sender).createEscrow(
        receiver.address, ethers.ZeroAddress, amount, "Test", duration,
        { value: amount }
      )).wait();
      await (await smartEscrow.connect(oracle).refund(0)).wait();
      const escrow = await smartEscrow.getEscrow(0);
      assert.equal(Number(escrow.status), 2);
    });

    it("Should reject sender refunding before deadline", async function () {
      const amount = ethers.parseEther("1.0");
      await (await smartEscrow.connect(sender).createEscrow(
        receiver.address, ethers.ZeroAddress, amount, "Test", duration,
        { value: amount }
      )).wait();
      await assert.rejects(
        smartEscrow.connect(sender).refund(0),
        /Deadline has not passed/
      );
    });
  });

  describe("ERC20 Token Escrow", function () {
    it("Should create and release token escrow via oracle", async function () {
      const tokenAddr = await mockToken.getAddress();
      const escrowAddr = await smartEscrow.getAddress();
      const tokenAmount = ethers.parseEther("10.0");

      await (await mockToken.transfer(sender.address, tokenAmount)).wait();
      await (await mockToken.connect(sender).approve(escrowAddr, tokenAmount)).wait();

      await (await smartEscrow.connect(sender).createEscrow(
        receiver.address, tokenAddr, tokenAmount, "Deliver code", duration
      )).wait();

      const balBefore = await mockToken.balanceOf(receiver.address);
      await (await smartEscrow.connect(oracle).release(0)).wait();
      const balAfter = await mockToken.balanceOf(receiver.address);

      assert.equal(balAfter - balBefore, tokenAmount);
    });
  });

  describe("Scheduled Escrow", function () {
    it("Should create a scheduled escrow", async function () {
      const amount = ethers.parseEther("1.0");
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600;
      await (await smartEscrow.connect(sender).createScheduledEscrow(
        receiver.address, ethers.ZeroAddress, amount, "Pay on date", futureTimestamp,
        { value: amount }
      )).wait();
      const escrow = await smartEscrow.getEscrow(0);
      assert.equal(Number(escrow.escrowType), 1);
      assert.equal(Number(escrow.status), 0);
    });

    it("Should execute scheduled release after time", async function () {
      const amount = ethers.parseEther("1.0");
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600;
      await (await smartEscrow.connect(sender).createScheduledEscrow(
        receiver.address, ethers.ZeroAddress, amount, "Pay on date", futureTimestamp,
        { value: amount }
      )).wait();

      // Advance block timestamp past the release time
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine", []);

      await (await smartEscrow.connect(oracle).executeScheduledRelease(0)).wait();
      const escrow = await smartEscrow.getEscrow(0);
      assert.equal(Number(escrow.status), 1);
    });

    it("Should reject scheduled release before time", async function () {
      const amount = ethers.parseEther("1.0");
      const futureTimestamp = Math.floor(Date.now() / 1000) + 7200;
      await (await smartEscrow.connect(sender).createScheduledEscrow(
        receiver.address, ethers.ZeroAddress, amount, "Pay on date", futureTimestamp,
        { value: amount }
      )).wait();
      await assert.rejects(
        smartEscrow.connect(oracle).executeScheduledRelease(0),
        /Scheduled time not reached/
      );
    });
  });

  describe("Recurring Escrow", function () {
    it("Should create a recurring escrow", async function () {
      const amount = ethers.parseEther("1.0");
      const interval = 86400;
      await (await smartEscrow.connect(sender).createRecurringEscrow(
        receiver.address, ethers.ZeroAddress, amount, "Monthly salary", interval, duration,
        { value: amount }
      )).wait();
      const escrow = await smartEscrow.getEscrow(0);
      assert.equal(Number(escrow.escrowType), 2);
      assert.equal(Number(escrow.interval), interval);
    });

    it("Should execute recurring payout", async function () {
      const amount = ethers.parseEther("1.0");
      const interval = 1;
      const recurringDuration = 3600;
      await (await smartEscrow.connect(sender).createRecurringEscrow(
        receiver.address, ethers.ZeroAddress, amount, "Recurring", interval, recurringDuration,
        { value: amount }
      )).wait();

      // First payout (lastRecurringExecution == 0, so interval check passes)
      const balBefore = await ethers.provider.getBalance(receiver.address);
      await (await smartEscrow.connect(oracle).executeRecurringPayout(0)).wait();
      const balAfter = await ethers.provider.getBalance(receiver.address);

      // Receiver should receive the per-payout amount
      assert.equal(balAfter - balBefore, amount);

      const escrow = await smartEscrow.getEscrow(0);
      // Recurring stays Active until deadline
      assert.equal(Number(escrow.status), 0);
    });

    it("Should reject recurring payout before interval", async function () {
      const amount = ethers.parseEther("1.0");
      const interval = 3600;
      await (await smartEscrow.connect(sender).createRecurringEscrow(
        receiver.address, ethers.ZeroAddress, amount, "Recurring", interval, 86400,
        { value: amount }
      )).wait();

      // First payout works
      await (await smartEscrow.connect(oracle).executeRecurringPayout(0)).wait();

      // Second payout immediately should fail
      await assert.rejects(
        smartEscrow.connect(oracle).executeRecurringPayout(0),
        /Interval not yet elapsed/
      );
    });
  });

  describe("NFT Conditional Escrow", function () {
    it("Should create NFT conditional escrow", async function () {
      const amount = ethers.parseEther("1.0");
      const nftAddr = await mockToken.getAddress();
      await (await smartEscrow.connect(sender).createNFTConditionalEscrow(
        receiver.address, ethers.ZeroAddress, amount, "Deliver NFT #1", duration, nftAddr, 1,
        { value: amount }
      )).wait();
      const escrow = await smartEscrow.getEscrow(0);
      assert.equal(Number(escrow.escrowType), 0);
      assert.equal(escrow.conditionTarget, nftAddr);
      assert.equal(Number(escrow.conditionTokenId), 1);
    });

    it("Should resolve NFT conditional escrow via oracle", async function () {
      const amount = ethers.parseEther("1.0");
      const nftAddr = await mockToken.getAddress();
      await (await smartEscrow.connect(sender).createNFTConditionalEscrow(
        receiver.address, ethers.ZeroAddress, amount, "Deliver NFT", duration, nftAddr, 1,
        { value: amount }
      )).wait();
      await (await smartEscrow.connect(oracle).resolveEscrow(0, true)).wait();
      const escrow = await smartEscrow.getEscrow(0);
      assert.equal(Number(escrow.status), 1);
    });
  });

  describe("Executor Functions", function () {
    it("Should allow executor to trigger scheduled release", async function () {
      const amount = ethers.parseEther("1.0");
      await (await smartEscrow.connect(oracle).updateExecutor(executor.address)).wait();

      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600;
      await (await smartEscrow.connect(sender).createScheduledEscrow(
        receiver.address, ethers.ZeroAddress, amount, "Test", futureTimestamp,
        { value: amount }
      )).wait();

      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine", []);

      await (await smartEscrow.connect(executor).executeScheduledRelease(0)).wait();
      const escrow = await smartEscrow.getEscrow(0);
      assert.equal(Number(escrow.status), 1);
    });

    it("Should allow executor to trigger recurring payout", async function () {
      const amount = ethers.parseEther("1.0");
      await (await smartEscrow.connect(oracle).updateExecutor(executor.address)).wait();

      await (await smartEscrow.connect(sender).createRecurringEscrow(
        receiver.address, ethers.ZeroAddress, amount, "Recurring", 1, 3600,
        { value: amount }
      )).wait();

      await (await smartEscrow.connect(executor).executeRecurringPayout(0)).wait();
      const escrow = await smartEscrow.getEscrow(0);
      assert.equal(Number(escrow.status), 0); // still Active
    });
  });
});
