// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

abstract contract Roles is Ownable {
    // --- ERRORS ---
    error AlreadyRegistered();
    error NotRegistered();
    error NotAnAdmin();
    error UserNotFound();

    // --- EVENTS ---
    event UserRegistered(address indexed userAddress, string name, Role role);
    event UserVerified(address indexed admin, address indexed userAddress);
    // [NEW] Event to signal that a user's profile has been updated.
    event ProfileUpdated(address indexed user, string name, string contactInfo, string profileMetadataURI);

    // --- DATA STRUCTURES ---
    enum Role { Patient, Doctor, HospitalAdmin, InsuranceProvider, Pharmacist, Researcher, Guardian }

    struct User {
        address walletAddress;
        string name;
        Role role;
        bool isVerified;
    }

    // [NEW] Struct to hold detailed user profile information.
    struct UserProfile {
        string name;
        string contactInfo;
        string profileMetadataURI; // For future use, e.g., IPFS link to more details
    }

    // --- STATE VARIABLES ---
    mapping(address => User) public users;
    // [NEW] Mapping to link wallet addresses to their detailed profiles.
    mapping(address => UserProfile) public userProfiles;

    // --- FUNCTIONS ---
    function registerUser(string memory _name, Role _role) public {
        if (users[msg.sender].walletAddress != address(0)) { revert AlreadyRegistered(); }
        if (_role == Role.HospitalAdmin) { revert("Cannot register as Admin directly."); }

        users[msg.sender] = User({
            walletAddress: msg.sender,
            name: _name,
            role: _role,
            isVerified: false
        });

        // [MODIFIED] Also create a default profile upon registration.
        userProfiles[msg.sender] = UserProfile({
            name: _name,
            contactInfo: "",
            profileMetadataURI: ""
        });

        emit UserRegistered(msg.sender, _name, _role);
    }

    // [NEW] Allows a registered user to create or update their profile details.
    function updateUserProfile(string calldata _name, string calldata _contactInfo, string calldata _profileMetadataURI) public {
        if (users[msg.sender].walletAddress == address(0)) { revert NotRegistered(); }

        userProfiles[msg.sender] = UserProfile({
            name: _name,
            contactInfo: _contactInfo,
            profileMetadataURI: _profileMetadataURI
        });

        // Also update the primary name in the User struct for consistency across the system.
        users[msg.sender].name = _name;

        emit ProfileUpdated(msg.sender, _name, _contactInfo, _profileMetadataURI);
    }


    function addHospitalAdmin(address _newAdmin, string memory _name) public onlyOwner {
        if (users[_newAdmin].walletAddress != address(0)) { revert AlreadyRegistered(); }

        users[_newAdmin] = User({
            walletAddress: _newAdmin,
            name: _name,
            role: Role.HospitalAdmin,
            isVerified: true
        });

        // [MODIFIED] Also create a default profile for the new admin.
        userProfiles[_newAdmin] = UserProfile({
            name: _name,
            contactInfo: "",
            profileMetadataURI: ""
        });

        emit UserRegistered(_newAdmin, _name, Role.HospitalAdmin);
    }

    function verifyUser(address _userToVerify) public {
        if (users[msg.sender].walletAddress == address(0)) { revert NotRegistered(); }
        if (users[msg.sender].role != Role.HospitalAdmin || !users[msg.sender].isVerified) { revert NotAnAdmin(); }
        if (users[_userToVerify].walletAddress == address(0)) { revert UserNotFound(); }

        users[_userToVerify].isVerified = true;
        emit UserVerified(msg.sender, _userToVerify);
    }
}
