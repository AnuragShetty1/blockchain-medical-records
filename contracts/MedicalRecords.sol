// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./AccessControl.sol";

contract MedicalRecords is AccessControl {
    constructor() Ownable(msg.sender) {}

    // --- EVENTS ---
    event RecordAdded(address indexed patient, string ipfsHash, uint256 timestamp);
    event RequestArrayUpdated(address indexed patient, uint256 newLength);

    // --- DATA STRUCTURES ---
    struct Record {
        string ipfsHash;
        uint256 timestamp;
        address uploadedBy;
    }

    // --- STATE VARIABLES ---
    mapping(address => Record[]) public patientRecords;

    // --- FUNCTIONS ---
    function addRecord(string memory _ipfsHash) public {
        if (users[msg.sender].walletAddress == address(0)) { revert NotRegistered(); }
        if (users[msg.sender].role != Role.Patient) { revert NotAPatient(); }
        patientRecords[msg.sender].push(Record({
            ipfsHash: _ipfsHash,
            timestamp: block.timestamp,
            uploadedBy: msg.sender
        }));
        emit RecordAdded(msg.sender, _ipfsHash, block.timestamp);
    }

    // MODIFIED: This now uses the new time-based permission check from AccessControl.sol
    function getPatientRecords(address _patientAddress) public view returns (Record[] memory) {
        if (msg.sender == _patientAddress) {
            return patientRecords[_patientAddress];
        }
        // Check if the stored timestamp is in the future.
        if (accessPermissions[_patientAddress][msg.sender] > block.timestamp) {
            return patientRecords[_patientAddress];
        }
        revert("You do not have permission to view these records.");
    }
}

