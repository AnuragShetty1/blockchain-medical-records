// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MedicalRecords {
    // --- ERRORS ---
    error AlreadyRegistered();
    error NotRegistered(); // New Error
    error NotAPatient();   // New Error
    error NotAnAdmin(); // New Error: For access control
    error UserNotFound(); // New Error: If admin tries to verify a non-existent user

    // --- EVENTS ---
    event UserRegistered(address indexed userAddress, string name, Role role);
    event RecordAdded(address indexed patient, string ipfsHash, uint256 timestamp); // New Event
    event UserVerified(address indexed admin, address indexed userAddress);

    // --- DATA STRUCTURES ---
    enum Role { Patient, Doctor, HospitalAdmin, InsuranceProvider, Pharmacist, Researcher, Guardian }

    struct User {
        address walletAddress;
        string name;
        Role role;
        bool isVerified;
    }

    struct Record {
        string ipfsHash;
        uint256 timestamp;
        address uploadedBy;
    }

    mapping(address => User) public users;
    mapping(address => Record[]) public patientRecords;

    // --- FUNCTIONS ---
    function registerUser(string memory _name, Role _role) public {
        if (users[msg.sender].walletAddress != address(0)) {
            revert AlreadyRegistered();
        }
        users[msg.sender] = User({
            walletAddress: msg.sender,
            name: _name,
            role: _role,
            isVerified: false
        });
        emit UserRegistered(msg.sender, _name, _role);
    }

    // --- NEW FUNCTION ---
    function addRecord(string memory _ipfsHash) public {
        // Check if the caller is registered
        if (users[msg.sender].walletAddress == address(0)) {
            revert NotRegistered();
        }
        // Check if the caller's role is Patient
        if (users[msg.sender].role != Role.Patient) {
            revert NotAPatient();
        }

        // Push the new record to the patient's record array
        patientRecords[msg.sender].push(Record({
            ipfsHash: _ipfsHash,
            timestamp: block.timestamp, // 'block.timestamp' is the current block's timestamp
            uploadedBy: msg.sender
        }));

        // Emit an event
        emit RecordAdded(msg.sender, _ipfsHash, block.timestamp);
    }

    // --- NEW VERIFICATION FUNCTION ---
    function verifyUser(address _userToVerify) public {
        // Check 1: Is the person calling this function registered?
        if (users[msg.sender].walletAddress == address(0)) {
            revert NotRegistered();
        }
        // Check 2: Does the person calling this function have the HospitalAdmin role?
        if (users[msg.sender].role != Role.HospitalAdmin) {
            revert NotAnAdmin();
        }
        // Check 3: Does the user we are trying to verify actually exist?
        if (users[_userToVerify].walletAddress == address(0)) {
            revert UserNotFound();
        }

        // Perform the action: Set the user's isVerified flag to true
        users[_userToVerify].isVerified = true;

        // Emit an event to signal the verification
        emit UserVerified(msg.sender, _userToVerify);
    }

    // --- NEW GETTER FUNCTION ---
    function getPatientRecords(address _patientAddress) public view returns (Record[] memory) {
        // This function returns the entire array of Record structs for a given patient
        return patientRecords[_patientAddress];
    }
}
