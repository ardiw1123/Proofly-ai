// SPDX-License-Identifier: MIT
pragma solidity ^0.8.37;

import "../contracts/ProofOfSkillSBT.sol";

interface Vm {
    function warp(uint256) external;
    function sign(uint256, bytes32) external pure returns (uint8, bytes32, bytes32);
}

contract ProofOfSkillSBTTest {
    ProofOfSkillSBT sbt;
    Vm constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    
    // Address derived from private key 0x1234...
    uint256 constant SIGNER_PK = 0xA11CE;
    // We can also compute signer address using ecrecover
    address signerAddress;

    receive() external payable {}

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }

    function setUp() public {
        bytes32 testHash = keccak256("test");
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(SIGNER_PK, testHash);
        signerAddress = ecrecover(testHash, v, r, s);
        sbt = new ProofOfSkillSBT(signerAddress);
    }

    function testStartAssessmentSuccess() public {
        sbt.startAssessment{value: 1 ether}(1);
        (uint8 attempts, uint256 lastTime, bool isCert) = sbt.candidateProgress(address(this), 1);
        require(attempts == 1, "Attempt should be 1");
        require(lastTime > 0, "Last time should be > 0");
        require(!isCert, "Should not be certified");
    }

    function testStartAssessmentIncorrectFeeReverts() public {
        try sbt.startAssessment{value: 0.5 ether}(1) {
            revert("Expected revert");
        } catch Error(string memory reason) {
            require(
                keccak256(bytes(reason)) == keccak256(bytes("Incorrect assessment fee")),
                "Wrong reason"
            );
        }
    }

    function testStartAssessmentInvalidSkillReverts() public {
        try sbt.startAssessment{value: 1 ether}(99) {
            revert("Expected revert");
        } catch Error(string memory reason) {
            require(
                keccak256(bytes(reason)) == keccak256(bytes("Invalid skill ID")),
                "Wrong reason"
            );
        }
    }

    function testStartAssessmentCooldownReverts() public {
        sbt.startAssessment{value: 1 ether}(1);
        try sbt.startAssessment{value: 1 ether}(1) {
            revert("Expected revert");
        } catch Error(string memory reason) {
            require(
                keccak256(bytes(reason)) == keccak256(bytes("Cooldown period active: wait 24 hours between attempts")),
                "Wrong reason"
            );
        }
    }

    function testStartAssessmentAfterCooldownSucceeds() public {
        sbt.startAssessment{value: 1 ether}(1);
        vm.warp(block.timestamp + 86401);
        sbt.startAssessment{value: 1 ether}(1);
        (uint8 attempts, , ) = sbt.candidateProgress(address(this), 1);
        require(attempts == 2, "Attempts should be 2");
    }

    function testStartAssessmentAlreadyCertifiedReverts() public {
        sbt.startAssessment{value: 1 ether}(1);

        // Mint certificate with valid signature
        bytes32 msgHash = keccak256(abi.encodePacked(address(this), uint8(1), uint16(90), uint8(1)));
        bytes32 ethSignedMsgHash = MessageHashUtils.toEthSignedMessageHash(msgHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(SIGNER_PK, ethSignedMsgHash);
        bytes memory sig = abi.encodePacked(r, s, v);

        sbt.mintCertificate(1, 90, 1, "ipfs://cert-1", sig);

        // Try to start assessment again after getting certified
        vm.warp(block.timestamp + 86401);
        try sbt.startAssessment{value: 1 ether}(1) {
            revert("Expected revert");
        } catch Error(string memory reason) {
            require(
                keccak256(bytes(reason)) == keccak256(bytes("Candidate already certified for this skill")),
                "Wrong reason"
            );
        }
    }
}
