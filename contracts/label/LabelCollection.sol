// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/*
  DESIGN NOTES:
  Token ids are a concatenation of:
 * creator: hex address of the creator of the token. 160 bits
 * index: Index for this token (the regular ID), up to 2^56 - 1. 56 bits
 * supply: Supply cap for this token, up to 2^40 - 1 (1 trillion).  40 bits

*/

library TokenIdentifiers {
    uint8 constant ADDRESS_BITS = 160;
    uint8 constant INDEX_BITS = 56;
    uint8 constant SUPPLY_BITS = 40;

    uint256 constant SUPPLY_MASK = (uint256(1) << SUPPLY_BITS) - 1;
    uint256 constant INDEX_MASK =
        ((uint256(1) << INDEX_BITS) - 1) ^ SUPPLY_MASK;

    function tokenMaxSupply(uint256 _id) internal pure returns (uint256) {
        return _id & SUPPLY_MASK;
    }

    function tokenIndex(uint256 _id) internal pure returns (uint256) {
        return _id & INDEX_MASK;
    }

    function tokenCreator(uint256 _id) internal pure returns (address) {
        return address(uint160(_id >> (INDEX_BITS + SUPPLY_BITS)));
    }
}

contract OwnableDelegateProxy {}

contract ProxyRegistry {
    mapping(address => OwnableDelegateProxy) public proxies;
}

contract LabelCollection is
    Initializable,
    ERC1155Upgradeable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ERC1155SupplyUpgradeable,
    UUPSUpgradeable
{
    struct CreatorsInfo {
        address[] creators;
        uint256[] royalties;
        uint256 totalroyalties;
    }

    address proxyRegistryAddress;
    string public name;
    string public symbol;
    mapping(uint256 => CreatorsInfo) private _tokenCredit;
    mapping(uint256 => string) public uriStorage;
    mapping(address => bool) private isMinter;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(string memory _baseUri, address _proxyRegistryAddress)
        public
        initializer
    {
        __ERC1155_init(_baseUri);
        __Ownable_init();
        __Pausable_init();
        __ERC1155Supply_init();
        __UUPSUpgradeable_init();
        name = "Label Collection";
        symbol = "LABEL";
        proxyRegistryAddress = _proxyRegistryAddress;
        isMinter[msg.sender] = true;
    }

    function grantMinterRole(address[] memory minters) external onlyOwner {
        for (uint256 i = 0; i < minters.length; i++) {
            isMinter[minters[i]] = true;
        }
    }

    function revokeMinterRole(address[] memory minters) external onlyOwner {
        for (uint256 i = 0; i < minters.length; i++) {
            isMinter[minters[i]] = false;
        }
    }

    function setURI(string memory newuri) public onlyOwner {
        _setURI(newuri);
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function getCreditsInfo(uint256 tokenId)
        public
        view
        returns (address[] memory, uint256[] memory,uint256)
    {
        CreatorsInfo memory credit = _tokenCredit[tokenId];

        return (credit.creators, credit.royalties,credit.totalroyalties);
    }

    function getTokenCreatorById(uint256 tokenId)
        public
        pure
        returns (address)
    {
        return TokenIdentifiers.tokenCreator(tokenId);
    }

    function getTokenIndexById(uint256 tokenId) public pure returns (uint256) {
        return TokenIdentifiers.tokenIndex(tokenId);
    }

    function getTokenMaxSupplyById(uint256 tokenId)
        public
        pure
        returns (uint256)
    {
        return TokenIdentifiers.tokenMaxSupply(tokenId);
    }

    function mint(
        address[] memory accounts, // the list of receivers after mint
        uint256[] memory amounts, // the amounts that receivers get after mint
        uint256 totalSupply,
        uint256 id,
        string memory uriStore,
        address[] memory creators,
        uint256[] memory royalties,
        uint256 totalRoyalties,
        bytes memory data
    ) public whenNotPaused {
        // require(isMinter[msg.sender], "Not minter");

        require(
            TokenIdentifiers.tokenCreator(id) == creators[0],
            "Invalid ID and creator"
        );

        require(
            accounts.length > 0 && accounts.length == amounts.length,
            "Invalid accounts"
        );

        require(
            creators.length > 0 && creators.length == royalties.length,
            "Invalid creators"
        );

        CreatorsInfo storage info = _tokenCredit[id];
        info.creators = creators;
        info.royalties = royalties; //[600,200,200]
        info.totalroyalties = totalRoyalties;
        uriStorage[id] = uriStore;

        //mint all to creator first
        _mint(creators[0], id, totalSupply, data);

        //transfer to the rest
        for (uint256 i = 0; i < accounts.length; i++) {
            if (creators[0] != accounts[i]) {
                _safeTransferFrom(
                    creators[0],
                    accounts[i],
                    id,
                    amounts[i],
                    data
                );
            }
        }
    }

    function tokenUri(uint256 id) public view returns (string memory) {
        return string(abi.encodePacked(uri(id), uriStorage[id]));
    }

    function isApprovedForAll(address _owner, address _operator)
        public
        view
        override
        returns (bool isOperator)
    {
        // Whitelist Label proxy contract for easy trading.
        ProxyRegistry proxyRegistry = ProxyRegistry(proxyRegistryAddress);
        if (address(proxyRegistry.proxies(_owner)) == _operator) {
            return true;
        }

        return ERC1155Upgradeable.isApprovedForAll(_owner, _operator);
    }

    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    )
        internal
        override(ERC1155Upgradeable, ERC1155SupplyUpgradeable)
        whenNotPaused
    {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyOwner
    {}
}
