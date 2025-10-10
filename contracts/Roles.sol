// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./Storage.sol";

/**
 * @title Roles
 * @dev This contract manages user registration, verification, and profile updates.
 * It is a logic contract that inherits its state from the Storage contract.
 */
contract Roles is Initializable, OwnableUpgradeable, Storage {
    // --- ERRORS ---
    error AlreadyRegistered();
    error NotRegistered();
    error NotAnAdmin();
    error UserNotFound();
    error PublicKeyAlreadySet();

    // --- EVENTS ---
    event UserRegistered(address indexed userAddress, string name, Role role);
    event UserVerified(address indexed admin, address indexed userAddress);
    event ProfileUpdated(address indexed user, string name, string contactInfo, string profileMetadataURI);
    event PublicKeySaved(address indexed user);

    // Internal initializer to set up the parent contract.
    function __Roles_init(address initialOwner) internal onlyInitializing {
        __Ownable_init(initialOwner);
    }

    // --- FUNCTIONS ---

    /**
     * @dev Registers a new user with a specified name and role.
     * Cannot register as an Admin directly.
     */
    function registerUser(string memory _name, Role _role) public {
        if (users[msg.sender].walletAddress != address(0)) { revert AlreadyRegistered(); }
        if (_role == Role.HospitalAdmin) { revert("Cannot register as Admin directly."); }

        users[msg.sender] = User({
            walletAddress: msg.sender,
            name: _name,
            role: _role,
            isVerified: false,
            publicKey: "" // Public key is set in a separate step
        });

        userProfiles[msg.sender] = UserProfile({
            name: _name,
            contactInfo: "",
            profileMetadataURI: ""
        });

        emit UserRegistered(msg.sender, _name, _role);
    }

    /**
     * @dev Allows a user to save their public encryption key on-chain.
     * This is a one-time action to build user trust and separate concerns.
     */
    function savePublicKey(string memory _publicKey) public {
        if (users[msg.sender].walletAddress == address(0)) { revert NotRegistered(); }
        if (bytes(users[msg.sender].publicKey).length > 0) { revert PublicKeyAlreadySet(); }

        users[msg.sender].publicKey = _publicKey;
        emit PublicKeySaved(msg.sender);
    }

    /**
     * @dev Allows a registered user to update their profile information.
     */
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

    /**
     * @dev Allows the contract owner to add a new Hospital Admin.
     * Admins are automatically verified upon creation.
     */
    function addHospitalAdmin(address _newAdmin, string memory _name) public onlyOwner {
        if (users[_newAdmin].walletAddress != address(0)) { revert AlreadyRegistered(); }

        users[_newAdmin] = User({
            walletAddress: _newAdmin,
            name: _name,
            role: Role.HospitalAdmin,
            isVerified: true,
            publicKey: "" // Admin will set their key separately
        });

        userProfiles[_newAdmin] = UserProfile({
            name: _name,
            contactInfo: "",
            profileMetadataURI: ""
        });

        emit UserRegistered(_newAdmin, _name, Role.HospitalAdmin);
    }

    /**
     * @dev Allows a verified Hospital Admin to verify other users (Doctors, etc.).
     */
    function verifyUser(address _userToVerify) public {
        if (users[msg.sender].walletAddress == address(0)) { revert NotRegistered(); }
        if (users[msg.sender].role != Role.HospitalAdmin || !users[msg.sender].isVerified) { revert NotAnAdmin(); }
        if (users[_userToVerify].walletAddress == address(0)) { revert UserNotFound(); }

        users[_userToVerify].isVerified = true;
        emit UserVerified(msg.sender, _userToVerify);
    }
}
