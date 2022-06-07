// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract OwnableDelegateProxy {}

contract ProxyRegistry {
    mapping(address => OwnableDelegateProxy) public proxies;
}

contract LabelCollection721 is
    Initializable,
    ERC721Upgradeable,
    ERC721EnumerableUpgradeable,
    ERC721URIStorageUpgradeable,
    PausableUpgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    struct CreatorsInfo {
        address[] creators;
        uint256[] royalties;
        uint256 totalRoyalty;
    }

    mapping(uint256 => CreatorsInfo) private _tokenCredit;

    address proxyRegistryAddress;
    string public nftBaseURI;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {}

    function initialize(
        string memory _nftBaseURI,
        address _proxyRegistryAddress
    ) public initializer {
        __ERC721_init("Label Collection 721", "LABEL");
        __ERC721Enumerable_init();
        __ERC721URIStorage_init();
        __Pausable_init();
        __Ownable_init();
        __UUPSUpgradeable_init();
        nftBaseURI = _nftBaseURI;
        proxyRegistryAddress = _proxyRegistryAddress;
    }

    function getCreditsInfo(uint256 tokenId)
        public
        view
        returns (
            address[] memory,
            uint256[] memory,
            uint256
        )
    {
        CreatorsInfo memory credit = _tokenCredit[tokenId];

        return (credit.creators, credit.royalties, credit.totalRoyalty);
    }

    function _baseURI() internal view override returns (string memory) {
        return nftBaseURI;
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function mint(
        address to,
        uint256 tokenId,
        string memory uri,
        address[] memory creators,
        uint256[] memory royalties,
        uint256 totalRoyalty
    ) public onlyOwner {
        CreatorsInfo storage info = _tokenCredit[tokenId];
        info.creators = creators;
        // check
        uint256 royaltySum = 0;

        for (uint256 i = 0; i < royalties.length; i++) {
            royaltySum += royalties[i];
        }

        require(royaltySum == 10000, "Invalid royalties");

        info.royalties = royalties;
        info.totalRoyalty = totalRoyalty;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    function isApprovedForAll(address owner, address operator)
        public
        view
        override
        returns (bool)
    {
        ProxyRegistry proxyRegistry = ProxyRegistry(proxyRegistryAddress);
        if (address(proxyRegistry.proxies(owner)) == operator) {
            return true;
        }

        return super.isApprovedForAll(owner, operator);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    )
        internal
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
        whenNotPaused
    {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyOwner
    {}

    // The following functions are overrides required by Solidity.

    function _burn(uint256 tokenId)
        internal
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
    {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
