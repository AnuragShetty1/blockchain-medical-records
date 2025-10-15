// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./AccessControl.sol";

/**
 * @title MedicalRecords
 * @dev The main entry point contract for the application.
 * It combines all logic from parent contracts (AccessControl, Roles) and
 * manages the creation and retrieval of medical records.
 * It is UUPS-upgradeable.
 */
contract MedicalRecords is AccessControl, UUPSUpgradeable {

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the entire contract chain and sets the initial owner.
     */
    function initialize(address initialOwner) public initializer {
        __AccessControl_init(initialOwner);
        __UUPSUpgradeable_init();
    }
    
    /**
     * @dev Required by UUPS for upgrade authorization. Restricts upgrades to the owner.
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        onlyOwner
        override
    {}

    // --- EVENTS ---
    event RecordAdded(
        uint256 indexed recordId,
        address indexed patient,
        address indexed uploadedBy,
        string category,
        bool isVerified,
        bytes encryptedKeyForPatient,
        bytes encryptedKeyForHospital
    );


    // --- FUNCTIONS ---

    /**
     * @dev Allows a patient to add a self-uploaded, non-verified medical record.
     * For self-uploads, both encrypted keys are intended for the patient.
     */
    function addSelfUploadedRecord(
        string memory _ipfsHash,
        string memory _category,
        bytes memory _encryptedKeyForPatient
    ) public {
        if (users[msg.sender].role != Role.Patient) { revert NotAPatient(); }
        
        _createRecord(
            msg.sender,
            _ipfsHash,
            _category,
            false,
            _encryptedKeyForPatient,
            _encryptedKeyForPatient // For self-upload, hospital key is just a copy for the patient
        );
    }

    /**
     * @dev Allows a verified professional (Doctor, LabTechnician) to add a verified record
     * on behalf of a patient, including separate encrypted keys for patient and hospital.
     */
    function addVerifiedRecord(
        address _patient,
        string memory _ipfsHash,
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
            _category,
            true,
            _encryptedKeyForPatient,
            _encryptedKeyForHospital
        );
    }

    /**
     * @dev Internal function to handle the creation and storage of a new record.
     * Grants permanent access to both the owner (patient) and the uploader.
     */
    function _createRecord(
        address _patient,
        string memory _ipfsHash,
        string memory _category,
        bool _isVerified,
        bytes memory _encryptedKeyForPatient,
        bytes memory _encryptedKeyForHospital
    ) private {
        uint256 recordId = records.length;
        
        records.push(Record({
            id: recordId,
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

        // Grant permanent access to the patient (owner) and the uploader
        recordAccess[recordId][_patient] = type(uint256).max;
        recordAccess[recordId][msg.sender] = type(uint256).max;

        emit RecordAdded(recordId, _patient, msg.sender, _category, _isVerified, _encryptedKeyForPatient, _encryptedKeyForHospital);
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

