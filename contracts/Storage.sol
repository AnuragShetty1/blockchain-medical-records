// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title Storage
 * @dev This contract holds all the state variables for the Medical Records application.
 * By separating storage from logic, we prevent storage collisions and make the
 * contract system more modular and upgradeable.
 * This is an abstract contract and is not meant to be deployed directly.
 */
abstract contract Storage {

    // --- DATA STRUCTURES ---

    // Defines the possible roles a user can have within the system.
    enum Role { Patient, Doctor, HospitalAdmin, InsuranceProvider, Pharmacist, Researcher, Guardian, LabTechnician }

    // Represents a registered user in the system.
    struct User {
        address walletAddress;
        string name;
        Role role;
        bool isVerified;
        string publicKey; // Added for hybrid encryption
    }

    // Stores additional profile information for a user.
    struct UserProfile {
        string name;
        string contactInfo;
        string profileMetadataURI;
    }

    // Represents a single medical record.
    struct Record {
        uint256 id;
        string ipfsHash;
        uint256 timestamp;
        address uploadedBy;
        address owner;
        bool isVerified;
        string category;
    }

    // Defines the status of an access request from an insurance provider.
    enum RequestStatus { Pending, Approved, Rejected }

    // Represents a request for access, typically from an insurance provider for a claim.
    struct AccessRequest {
        uint256 id;
        address patient;
        address provider;
        string claimId;
        RequestStatus status;
    }

    // --- STATE VARIABLES ---

    // Core user data storage
    mapping(address => User) public users;
    mapping(address => UserProfile) public userProfiles;

    // Record storage and access control
    Record[] public records; // All records are stored in a single array. The index is the record ID.
    mapping(address => uint256[]) public patientRecordIds; // Maps a patient's address to an array of their record IDs.
    
    // Manages access permissions on a per-record basis.
    // recordId -> userAddress -> expirationTimestamp
    mapping(uint256 => mapping(address => uint256)) public recordAccess;

    // Insurance provider access request management
    mapping(address => AccessRequest[]) public patientRequests;
    uint256 internal _nextRequestId;
}
