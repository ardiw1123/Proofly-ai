// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title ProofOfSkillSBT
 * @notice ERC-721 Soulbound Token (SBT) for decentralized AI-evaluated competency verification on BOT Chain.
 * @dev Transfers between non-zero addresses are blocked in _update.
 */
contract ProofOfSkillSBT is ERC721, Ownable {
    using ECDSA for bytes32;

    struct Certificate {
        uint8 skillId;          // 1: SQL, 2: Python, 3: Solidity
        uint16 score;           // Skor 0 - 100
        uint8 attemptCount;     // Jumlah percobaan hingga lulus
        uint256 completionDate; // Unix timestamp kelulusan
        string tokenURI;        // URI metadata IPFS / storage
    }

    struct CandidateState {
        uint8 currentAttempts;  // Total percobaan yang telah diambil
        uint256 lastAttemptTime;// Timestamp percobaan terakhir
        bool isCertified;       // Apakah sudah memiliki sertifikat aktif
    }

    // Mapping address => skillId => CandidateState
    mapping(address => mapping(uint8 => CandidateState)) public candidateProgress;

    // Mapping tokenId => Certificate
    mapping(uint256 => Certificate) public certificates;

    // Mapping user => skillId => tokenId
    mapping(address => mapping(uint8 => uint256)) public userCertificates;

    // Token ID tracker
    uint256 private _nextTokenId;

    // Public key / address of the backend AI signer service
    address public aiSignerAddress;

    // Assessment fee in native currency (1 ether default)
    uint256 public assessmentFee = 1 ether;

    // Cooldown duration: 24 hours
    uint256 public constant COOLDOWN_PERIOD = 24 hours;

    // Events
    event AssessmentStarted(address indexed candidate, uint8 indexed skillId, uint8 attempt);
    event CertificateIssued(address indexed candidate, uint8 indexed skillId, uint256 tokenId, uint16 score);
    event AiSignerUpdated(address indexed oldSigner, address indexed newSigner);
    event AssessmentFeeUpdated(uint256 oldFee, uint256 newFee);

    constructor(address _aiSigner) ERC721("ProofOfSkill Soulbound Certificate", "POS-SBT") Ownable(msg.sender) {
        require(_aiSigner != address(0), "Invalid AI signer");
        aiSignerAddress = _aiSigner;
    }

    /**
     * @notice Pay fee and register an assessment attempt.
     * @param skillId Identifier of the skill track (1: SQL, 2: Python, 3: Solidity).
     */
    function startAssessment(uint8 skillId) external payable {
        require(skillId >= 1 && skillId <= 3, "Invalid skill ID");
        require(msg.value == assessmentFee, "Incorrect assessment fee");

        CandidateState storage state = candidateProgress[msg.sender][skillId];
        require(!state.isCertified, "Candidate already certified for this skill");

        if (state.lastAttemptTime > 0) {
            require(
                block.timestamp >= state.lastAttemptTime + COOLDOWN_PERIOD,
                "Cooldown period active: wait 24 hours between attempts"
            );
        }

        state.currentAttempts += 1;
        state.lastAttemptTime = block.timestamp;

        emit AssessmentStarted(msg.sender, skillId, state.currentAttempts);
    }

    /**
     * @notice Mint a Soulbound Certificate upon passing assessment (score >= 80) with AI signature.
     * @param skillId Identifier of the skill track.
     * @param score Final evaluated score (0-100). Must be >= 80.
     * @param attempt Attempt count at the time of completion.
     * @param uri IPFS or decentralized storage URI for token metadata.
     * @param signature Cryptographic ECDSA signature from aiSignerAddress.
     */
    function mintCertificate(
        uint8 skillId,
        uint16 score,
        uint8 attempt,
        string memory uri,
        bytes memory signature
    ) external {
        require(skillId >= 1 && skillId <= 3, "Invalid skill ID");
        require(score >= 80, "Passing grade is 80 or higher");

        CandidateState storage state = candidateProgress[msg.sender][skillId];
        require(!state.isCertified, "Candidate already certified for this skill");

        // Verify cryptographic signature from AI backend
        bytes32 messageHash = keccak256(
            abi.encodePacked(msg.sender, skillId, score, attempt)
        );
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        address recoveredSigner = ECDSA.recover(ethSignedMessageHash, signature);

        require(recoveredSigner == aiSignerAddress, "Invalid AI evaluation signature");

        _nextTokenId++;
        uint256 newTokenId = _nextTokenId;

        _safeMint(msg.sender, newTokenId);

        certificates[newTokenId] = Certificate({
            skillId: skillId,
            score: score,
            attemptCount: attempt,
            completionDate: block.timestamp,
            tokenURI: uri
        });

        userCertificates[msg.sender][skillId] = newTokenId;
        state.isCertified = true;

        emit CertificateIssued(msg.sender, skillId, newTokenId, score);
    }

    /**
     * @notice Override tokenURI to return stored IPFS metadata URI.
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return certificates[tokenId].tokenURI;
    }

    /**
     * @notice Enforce Soulbound non-transferable property.
     * @dev Only allows minting (from == address(0)) or burning (to == address(0)).
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);

        // Allow minting (from == 0) and burning (to == 0)
        if (from != address(0) && to != address(0)) {
            revert("ProofOfSkill: Soulbound tokens cannot be transferred");
        }

        return super._update(to, tokenId, auth);
    }

    // View helper functions
    function getCandidateState(address candidate, uint8 skillId) external view returns (CandidateState memory) {
        return candidateProgress[candidate][skillId];
    }

    function getCertificate(uint256 tokenId) external view returns (Certificate memory) {
        _requireOwned(tokenId);
        return certificates[tokenId];
    }

    function getUserCertificate(address candidate, uint8 skillId)
        external
        view
        returns (Certificate memory cert, bool hasCert, uint256 tokenId)
    {
        tokenId = userCertificates[candidate][skillId];
        if (tokenId > 0) {
            return (certificates[tokenId], true, tokenId);
        }
        return (Certificate(0, 0, 0, 0, ""), false, 0);
    }

    // Admin configuration
    function setAiSignerAddress(address newSigner) external onlyOwner {
        require(newSigner != address(0), "Invalid address");
        emit AiSignerUpdated(aiSignerAddress, newSigner);
        aiSignerAddress = newSigner;
    }

    function setAssessmentFee(uint256 newFee) external onlyOwner {
        emit AssessmentFeeUpdated(assessmentFee, newFee);
        assessmentFee = newFee;
    }

    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdraw failed");
    }
}
