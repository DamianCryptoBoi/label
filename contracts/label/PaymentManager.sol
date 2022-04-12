// SPDX-License-Identifier: Ulicensed
pragma solidity 0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

interface ILabelCollection {
    function getCreditsInfo(uint256 tokenId)
        external
        view
        returns (
            address[] memory,
            uint256[] memory,
            uint256
        );
}

contract PaymentManager is
    Initializable,
    OwnableUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable
{
    ILabelCollection public labelCollection;
    address public platformFeeRecipient;
    uint256 public platformFee;
    uint256 public feeDenominator;

    event PlatformFeeRecipientChanged(address feeRecipient);
    event PlatformFeeChanged(uint256 fee);
    event LabelCollectionChanged(address labelCollection);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(
        address _labelCollection,
        address _platformFeeRecipient,
        uint256 _platformFee
    ) public initializer {
        __Ownable_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        _setLabelCollection(_labelCollection);
        _setPlatformFeeRecipient(_platformFeeRecipient);
        _setPlatformFee(_platformFee);
        feeDenominator = 10000;
    }

    function _setLabelCollection(address _labelCollection) internal {
        labelCollection = ILabelCollection(_labelCollection);
        emit LabelCollectionChanged(_labelCollection);
    }

    function _setPlatformFeeRecipient(address _platformFeeRecipient) internal {
        platformFeeRecipient = _platformFeeRecipient;
        emit PlatformFeeRecipientChanged(_platformFeeRecipient);
    }

    function _setPlatformFee(uint256 _platformFee) internal {
        platformFee = _platformFee;
        emit PlatformFeeChanged(_platformFee);
    }

    function setLabelCollection(address _labelCollection) external onlyOwner {
        _setLabelCollection(_labelCollection);
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function setPlatformFeeRecipient(address _platformFeeRecipient)
        external
        onlyOwner
    {
        _setPlatformFeeRecipient(_platformFeeRecipient);
    }

    function setPlatformFee(uint256 _platformFee) external onlyOwner {
        _setPlatformFee(_platformFee);
    }

    function getFeeAmount(uint256 _total, uint256 _ratio)
        internal
        view
        returns (uint256)
    {
        return (_total * _ratio) / feeDenominator;
    }

    function payForNFT(
        address _from,
        address _to,
        uint256 _totalAmount,
        IERC20Upgradeable _paymentToken,
        uint256 _nftId
    ) external whenNotPaused {
        address[] memory feeRecipients;
        uint256[] memory feeRatios;
        uint256 totalRoyalties;
        (feeRecipients, feeRatios, totalRoyalties) = labelCollection
            .getCreditsInfo(_nftId);

        require(feeRecipients.length == feeRatios.length, "invalid fee info");
        uint256 payAmount = _totalAmount;

        // pay platform fees
        uint256 platformFeeAmount = getFeeAmount(_totalAmount, platformFee);

        if (platformFeeRecipient != address(0)) {
            _paymentToken.transferFrom(
                _from,
                platformFeeRecipient,
                platformFeeAmount
            );
        }
        payAmount -= platformFeeAmount;

        // pay royalties
        uint256 totalRoyaltyAmount = getFeeAmount(_totalAmount, totalRoyalties);
        for (uint256 i = 0; i < feeRatios.length; i++) {
            uint256 feeAmount = getFeeAmount(totalRoyaltyAmount, feeRatios[i]);
            _paymentToken.transferFrom(_from, feeRecipients[i], feeAmount);
            payAmount -= feeAmount;
        }

        //transfer to seller
        _paymentToken.transferFrom(_from, _to, payAmount);
    }

    function multiTransfer(
        IERC20Upgradeable _paymentToken,
        address[] memory _receipients,
        uint256[] memory _amounts
    ) external whenNotPaused {
        require(_receipients.length == _amounts.length, "invalid amounts");
        for (uint256 i = 0; i < _receipients.length; i++) {
            _paymentToken.transferFrom(
                msg.sender,
                _receipients[i],
                _amounts[i]
            );
        }
    }

    function withdrawFee(IERC20Upgradeable _paymentToken, address _receipient)
        external
    {
        uint256 amount = _paymentToken.balanceOf(address(this));
        _paymentToken.transferFrom(msg.sender, _receipient, amount);
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyOwner
    {}
}
