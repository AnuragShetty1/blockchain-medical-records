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

    // [MODIFIED] Added SuperAdmin role.
    enum Role { Patient, Doctor, HospitalAdmin, InsuranceProvider, Pharmacist, Researcher, Guardian, LabTechnician, SuperAdmin }

    // Represents a registered user in the system.
    struct User {
        address walletAddress;
        string name;
        Role role;
        bool isVerified;
        string publicKey;
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

    // Defines the status of an access request.
    enum RequestStatus { Pending, Approved, Rejected }

    // Represents a request for access, typically from an insurance provider for a claim.
    struct AccessRequest {
        uint256 id;
        address patient;
        address provider;
        string claimId;
        RequestStatus status;
    }
    
    // [NEW] Struct to store hospital data.
    struct Hospital {
        uint256 hospitalId;
        string name;
        address adminAddress;
        bool isVerified;
    }
    
    // [NEW] Struct for hospital registration requests.
    struct RegistrationRequest {
        uint256 hospitalId;
        string name;
        address requesterAddress;
        RequestStatus status;
    }


    // --- STATE VARIABLES ---

    // Core user data storage
    mapping(address => User) public users;
    mapping(address => UserProfile) public userProfiles;

    // Record storage and access control
    Record[] public records;
    mapping(address => uint256[]) public patientRecordIds;
    mapping(uint256 => mapping(address => uint256)) public recordAccess;

    // Insurance provider access request management
    mapping(address => AccessRequest[]) public patientRequests;
    uint256 internal _nextRequestId;

    // [NEW] Hospital and role management
    mapping(uint256 => Hospital) public hospitals;
    uint256 public hospitalIdCounter;
    mapping(uint256 => RegistrationRequest) public registrationRequests;
    mapping(address => uint256) public userToHospital; // userAddress => hospitalId
}
