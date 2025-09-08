// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract Roles is Initializable, OwnableUpgradeable {
    // --- ERRORS ---
    error AlreadyRegistered();
    error NotRegistered();
    error NotAnAdmin();
    error UserNotFound();

    // --- EVENTS ---
    event UserRegistered(address indexed userAddress, string name, Role role);
    event UserVerified(address indexed admin, address indexed userAddress);
    event ProfileUpdated(address indexed user, string name, string contactInfo, string profileMetadataURI);

    // --- DATA STRUCTURES ---
    enum Role { Patient, Doctor, HospitalAdmin, InsuranceProvider, Pharmacist, Researcher, Guardian }

    struct User {
        address walletAddress;
        string name;
        Role role;
        bool isVerified;
    }

    struct UserProfile {
        string name;
        string contactInfo;
        string profileMetadataURI;
    }

    // --- STATE VARIABLES ---
    mapping(address => User) public users;
    mapping(address => UserProfile) public userProfiles;

    // Internal initializer to set up the parent contract.
    function __Roles_init(address initialOwner) internal onlyInitializing {
        __Ownable_init(initialOwner);
    }

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

        userProfiles[msg.sender] = UserProfile({
            name: _name,
            contactInfo: "",
            profileMetadataURI: ""
        });

        emit UserRegistered(msg.sender, _name, _role);
    }

    function updateUserProfile(string calldata _name, string calldata _contactInfo, string calldata _profileMetadataURI) public {
        if (users[msg.sender].walletAddress == address(0)) { revert NotRegistered(); }

        userProfiles[msg.sender] = UserProfile({
            name: _name,
            contactInfo: _contactInfo,
            profileMetadataURI: _profileMetadataURI
        });
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

