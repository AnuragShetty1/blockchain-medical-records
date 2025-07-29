// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MedicalRecords {
    // Custom error to handle cases where a user tries to register more than once
    error AlreadyRegistered();

    // Event to be emitted when a new user successfully registers
    event UserRegistered(address indexed userAddress, string name, Role role);

    // An enumeration to represent the different roles in the system
    enum Role {
        Patient,
        Doctor,
        HospitalAdmin,
        InsuranceProvider,
        Pharmacist,
        Researcher,
        Guardian
    }

    // A structure to hold information about each user
    struct User {
        address walletAddress; // The user's unique Ethereum wallet address
        string name;           // The user's name
        Role role;             // Their assigned role from the enum above
        bool isVerified;       // A flag to check if a user (like a doctor) is verified
    }

    // A structure to hold information about a single medical record
    struct Record {
        string ipfsHash;    // The hash/address of the file on IPFS
        uint256 timestamp;  // The time the record was uploaded (as a Unix timestamp)
        address uploadedBy; // The address of the person who uploaded it (e.g., a doctor)
    }

    // A mapping to link a wallet address to a User struct
    mapping(address => User) public users;

    // A mapping to link a patient's address to a list (array) of their records
    mapping(address => Record[]) public patientRecords;

    // Function to allow a new user to register
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
}
