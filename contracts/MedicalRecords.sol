// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./AccessControl.sol";

contract MedicalRecords is Initializable, AccessControl, UUPSUpgradeable {

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner) public initializer {
        // This function now correctly initializes the entire contract chain.
        __AccessControl_init(initialOwner);
        __UUPSUpgradeable_init();
    }
    
    // This function is required by UUPS to authorize an upgrade.
    // It restricts upgrade functionality to the contract owner.
    function _authorizeUpgrade(address newImplementation)
        internal
        onlyOwner
        override
    {}

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

    function getPatientRecords(address _patientAddress) public view returns (Record[] memory) {
        if (msg.sender == _patientAddress) {
            return patientRecords[_patientAddress];
        }
        if (accessPermissions[_patientAddress][msg.sender] > block.timestamp) {
            return patientRecords[_patientAddress];
        }
        revert("You do not have permission to view these records.");
    }
}

