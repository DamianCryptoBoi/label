// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract Label1155 is
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
    }

    string public name;
    string public symbol;
    mapping(uint256 => CreatorsInfo) private _tokenCredit;
    mapping(uint256 => string) public uriStorage;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() public initializer {
        __ERC1155_init("");
        __Ownable_init();
        __Pausable_init();
        __ERC1155Supply_init();
        __UUPSUpgradeable_init();
        name = "LABEL 1155";
        symbol = "LABEL";
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

    function mint(
        address[] memory accounts,
        uint256[] memory amounts,
        uint256 id,
        string memory uriStore,
        address[] memory creators,
        uint256[] memory royalties,
        bytes memory data
    ) public whenNotPaused {
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
        info.royalties = royalties;

        uriStorage[id] = uriStore;

        for (uint256 i = 0; i < accounts.length; i++) {
            _mint(accounts[i], id, amounts[i], data);
        }
    }

    function tokenUri(uint256 id) public view returns (string memory) {
        return string(abi.encodePacked(uri(id), uriStorage[id]));
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
