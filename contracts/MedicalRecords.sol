// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./AccessControl.sol";

/**
 * @title MedicalRecords
 * @dev The main entry point contract for the application.
 */
contract MedicalRecords is AccessControl, UUPSUpgradeable {

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner) public initializer {
        __AccessControl_init(initialOwner);
        __UUPSUpgradeable_init();
    }
    
    function _authorizeUpgrade(address newImplementation)
        internal
        onlyOwner
        override
    {}

    // --- EVENTS ---
    event RecordAdded(
        uint256 indexed recordId,
        address indexed owner,
        string title,
        string ipfsHash,
        string category,
        bool isVerified,
        address uploadedBy,
        uint256 timestamp
    );


    // --- FUNCTIONS ---

    /**
     * @dev Allows a patient to add a self-uploaded, non-verified medical record.
     */
    function addSelfUploadedRecord(
        string memory _ipfsHash,
        string memory _title,
        string memory _category
    ) public {
        if (users[msg.sender].role != Role.Patient) { revert NotAPatient(); }
        
        _createRecord(
            msg.sender,
            _ipfsHash,
            _title, // Pass title to internal function
            _category,
            false,
            bytes(""), // Pass empty bytes for patient key (no longer used in this flow)
            bytes("")  // Pass empty bytes for hospital key (no longer used in this flow)
        );
    }

    /**
     * @dev Allows a verified professional to add a verified record for a patient.
     */
    function addVerifiedRecord(
        address _patient,
        string memory _ipfsHash,
        string memory _title,
        string memory _category,
        bytes memory _encryptedKeyForPatient,
        bytes memory _encryptedKeyForHospital
    ) public {
        if (users[_patient].walletAddress == address(0)) { revert UserNotFound(); }
        if (users[_patient].role != Role.Patient) { revert NotAPatient(); }

        User storage professional = users[msg.sender];
        if (
            (professional.role != Role.Doctor && professional.role != Role.LabTechnician) ||
            !professional.isVerified
        ) {
            revert NotAVerifiedProfessional();
        }

        _createRecord(
            _patient,
            _ipfsHash,
            _title,
            _category,
            true,
            _encryptedKeyForPatient,
            _encryptedKeyForHospital
        );
    }

    /**
     * @dev Internal function to handle the creation and storage of a new record.
     */
    function _createRecord(
        address _patient,
        string memory _ipfsHash,
        string memory _title,
        string memory _category,
        bool _isVerified,
        bytes memory _encryptedKeyForPatient,
        bytes memory _encryptedKeyForHospital
    ) private {
        uint256 recordId = records.length;
        
        records.push(Record({
            id: recordId,
            title: _title, // <-- Set the title here
            ipfsHash: _ipfsHash,
            timestamp: block.timestamp,
            uploadedBy: msg.sender,
            owner: _patient,
            isVerified: _isVerified,
            category: _category,
            encryptedKeyForPatient: _encryptedKeyForPatient,
            encryptedKeyForHospital: _encryptedKeyForHospital
        }));

        patientRecordIds[_patient].push(recordId);

        recordAccess[recordId][_patient] = type(uint256).max;
        recordAccess[recordId][msg.sender] = type(uint256).max;

        emit RecordAdded(
            recordId,
            _patient,
            _title,
            _ipfsHash,
            _category,
            _isVerified,
            msg.sender,
            block.timestamp
        );
    }

    // --- VIEW FUNCTIONS ---

    function getPatientRecordIds(address _patientAddress) public view returns (uint256[] memory) {
        if (msg.sender != _patientAddress) {
            revert NotAuthorized();
        }
        return patientRecordIds[_patientAddress];
    }

    function getRecordById(uint256 _recordId) public view returns (Record memory) {
        if (!checkRecordAccess(_recordId, msg.sender)) {
            revert NotAuthorized();
        }
        return records[_recordId];
    }
}

