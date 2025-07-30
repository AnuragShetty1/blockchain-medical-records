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

    // --- DATA STRUCTURES ---
    enum Role { Patient, Doctor, HospitalAdmin, InsuranceProvider, Pharmacist, Researcher, Guardian }

    struct User {
        address walletAddress;
        string name;
        Role role;
        bool isVerified;
    }

    // --- STATE VARIABLES ---
    mapping(address => User) public users;

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
        emit UserRegistered(msg.sender, _name, _role);
    }

    function addHospitalAdmin(address _newAdmin, string memory _name) public onlyOwner {
        if (users[_newAdmin].walletAddress != address(0)) { revert AlreadyRegistered(); }

        users[_newAdmin] = User({
            walletAddress: _newAdmin,
            name: _name,
            role: Role.HospitalAdmin,
            isVerified: true
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
