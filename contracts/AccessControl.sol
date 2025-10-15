// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Roles.sol";

/**
 * @title AccessControl
 * @dev Manages access permissions for medical records.
 * It is a logic contract that inherits state from Storage via Roles.
 */
contract AccessControl is Roles {
    // --- ERRORS ---
    error NotAPatient();
    error NotAVerifiedProfessional();
    error AccessAlreadyGranted();
    error NoAccessToRevoke();
    error NotAnInsuranceProvider();
    error RequestNotFound();
    error RecordNotFound();
    error NotRecordOwner();
    error InputArrayLengthMismatch();

    // --- EVENTS ---
    event AccessGranted(uint256 indexed recordId, address indexed owner, address indexed grantee, uint256 expiration, bytes encryptedDek);
    event RecordAccessRevoked(uint256 indexed recordId, address indexed professionalAddress);
    event AccessRequested(uint256 indexed requestId, address indexed patient, address indexed provider, string claimId);
    event RequestApproved(uint256 indexed requestId, address indexed patient, uint256 accessDuration);

    // Internal initializer to set up the parent contract chain.
    function __AccessControl_init(address initialOwner) internal onlyInitializing {
        __Roles_init(initialOwner);
    }

    // --- FUNCTIONS ---

    /**
     * @dev Grants a user timed access to a specific medical record.
     */
    function grantRecordAccess(uint256 _recordId, address _grantee, uint256 _durationInDays, bytes memory _encryptedDek) public {
        if (_recordId >= records.length) { revert RecordNotFound(); }
        Record storage recordToAccess = records[_recordId];
        if (recordToAccess.owner != msg.sender) { revert NotRecordOwner(); }
        
        User storage grantee = users[_grantee];
        if (
            (grantee.role != Role.Doctor &&
            grantee.role != Role.LabTechnician &&
            grantee.role != Role.InsuranceProvider &&
            grantee.role != Role.Pharmacist &&
            grantee.role != Role.Researcher) ||
            !grantee.isVerified
        ) { revert NotAVerifiedProfessional(); }

        if (recordAccess[_recordId][_grantee] > block.timestamp) { revert AccessAlreadyGranted(); }

        uint256 expirationTime = block.timestamp + (_durationInDays * 1 days);
        recordAccess[_recordId][_grantee] = expirationTime;

        emit AccessGranted(_recordId, msg.sender, _grantee, expirationTime, _encryptedDek);
    }

    /**
     * @dev Grants a user timed access to multiple medical records in a single transaction.
     */
    function grantMultipleRecordAccess(uint256[] memory _recordIds, address _grantee, uint256 _durationInDays, bytes[] memory _encryptedDeks) public {
        if (_recordIds.length != _encryptedDeks.length) { revert InputArrayLengthMismatch(); }

        User storage grantee = users[_grantee];
        if (
            (grantee.role != Role.Doctor &&
            grantee.role != Role.LabTechnician &&
            grantee.role != Role.InsuranceProvider &&
            grantee.role != Role.Pharmacist &&
            grantee.role != Role.Researcher) ||
            !grantee.isVerified
        ) { revert NotAVerifiedProfessional(); }

        uint256 expirationTime = block.timestamp + (_durationInDays * 1 days);

        for (uint i = 0; i < _recordIds.length; i++) {
            uint256 recordId = _recordIds[i];
            if (recordId < records.length && records[recordId].owner == msg.sender) {
                if (recordAccess[recordId][_grantee] <= block.timestamp) {
                    recordAccess[recordId][_grantee] = expirationTime;
                    emit AccessGranted(recordId, msg.sender, _grantee, expirationTime, _encryptedDeks[i]);
                }
            }
        }
    }

    /**
     * @dev Revokes a professional's access to a specific medical record.
     */
    function revokeRecordAccess(uint256 recordId, address professionalAddress) public {
        if (recordId >= records.length) { revert RecordNotFound(); }
        Record storage recordToAccess = records[recordId];

        if (recordToAccess.owner != msg.sender) { revert NotRecordOwner(); }
        if (recordAccess[recordId][professionalAddress] == 0) { revert NoAccessToRevoke(); }

        delete recordAccess[recordId][professionalAddress];
        
        emit RecordAccessRevoked(recordId, professionalAddress);
    }

    /**
     * @dev Allows an insurance provider to request access to a patient's records for a claim.
     */
    function requestAccess(address _patientAddress, string memory _claimId) public {
       if (users[msg.sender].role != Role.InsuranceProvider) { revert NotAnInsuranceProvider(); }
       if (users[_patientAddress].role != Role.Patient) { revert NotAPatient(); }
       uint256 requestId = _nextRequestId++;
       patientRequests[_patientAddress].push(AccessRequest({
           id: requestId,
           patient: _patientAddress,
           provider: msg.sender,
           claimId: _claimId,
           status: RequestStatus.Pending
       }));
       emit AccessRequested(requestId, _patientAddress, msg.sender, _claimId);
    }

    /**
     * @dev Allows a patient to approve an insurance provider's request.
     */
    function approveRequest(uint256 _requestId, uint256 _durationInDays) public {
        if (users[msg.sender].role != Role.Patient) { revert NotAPatient(); }
        AccessRequest[] storage requests = patientRequests[msg.sender];
        bool found = false;
        for (uint i = 0; i < requests.length; i++) {
            if (requests[i].id == _requestId && requests[i].status == RequestStatus.Pending) {
                requests[i].status = RequestStatus.Approved;
                uint256 expirationTime = block.timestamp + (_durationInDays * 1 days);
                address provider = requests[i].provider;

                uint256[] storage recordIds = patientRecordIds[msg.sender];
                for (uint j = 0; j < recordIds.length; j++) {
                    uint256 recordId = recordIds[j];
                    recordAccess[recordId][provider] = expirationTime;
                    emit AccessGranted(recordId, msg.sender, provider, expirationTime, "");
                }

                found = true;
                emit RequestApproved(_requestId, msg.sender, _durationInDays);
                break;
            }
        }
        if (!found) { revert RequestNotFound(); }
    }

    // --- VIEW FUNCTIONS ---

    function checkRecordAccess(uint256 _recordId, address _viewer) public view returns (bool) {
        if (_recordId >= records.length) { return false; }
        Record storage recordToCheck = records[_recordId];
        if (recordToCheck.owner == _viewer || recordToCheck.uploadedBy == _viewer) { return true; }
        return recordAccess[_recordId][_viewer] > block.timestamp;
    }

    function getPatientRequestsCount(address _patientAddress) public view returns (uint256) {
        if (msg.sender != _patientAddress) { revert NotAuthorized(); }
        return patientRequests[_patientAddress].length;
    }

    function getPatientRequestAtIndex(address _patientAddress, uint256 _index) public view returns (AccessRequest memory) {
        if (msg.sender != _patientAddress) { revert NotAuthorized(); }
        return patientRequests[_patientAddress][_index];
    }
}

