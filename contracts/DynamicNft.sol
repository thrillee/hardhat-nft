// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "base64-sol/base64.sol";

contract DynamicNft is ERC721, Ownable {
    string private constant base64EncodedSVGPrefix = "data:image/svg+xml;base64,";

    uint256 s_tokenCounter;
    string private i_lowImageUri;
    string private i_highImageUri;
    AggregatorV3Interface private i_priceFeed;
    mapping(uint256 => uint256) public s_tokenIdToHighValue;

    event CreatedNFT(uint256 indexed tokenId, uint256 highValue);

    constructor(
        address priceFeeAddress,
        string memory lowSVG,
        string memory highSVG
    ) ERC721("Dynamic NFT SVG", "DSN") {
        i_priceFeed = AggregatorV3Interface(priceFeeAddress);
        s_tokenCounter = 0;
        i_lowImageUri = svgToImageURI(lowSVG);
        i_highImageUri = svgToImageURI(highSVG);
    }

    function svgToImageURI(string memory svg) public pure returns (string memory) {
        string memory svgBase64Encoded = Base64.encode(bytes(string(abi.encodePacked(svg))));
        return string(abi.encodePacked(base64EncodedSVGPrefix, svgBase64Encoded));
    }

    function mintNft(uint256 highValue) public {
        s_tokenIdToHighValue[s_tokenCounter] = highValue;

        _safeMint(msg.sender, s_tokenCounter);
        emit CreatedNFT(s_tokenCounter, highValue);
        s_tokenCounter += 1;
    }

    function _baseURI() internal pure override returns (string memory) {
        return "data:application/json;base64,";
    }

    function getPrice() internal view returns (uint256) {
        (, int256 price, , , ) = i_priceFeed.latestRoundData();

        return uint256(price * 1e10);
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
        string memory imageURI = i_lowImageUri;
        if (getPrice() >= s_tokenIdToHighValue[tokenId]) {
            imageURI = i_highImageUri;
        }

        string memory name = string(abi.encodePacked('"name": "', name(), '"'));
        string memory image = string(abi.encodePacked('"image": "', imageURI, '"'));
        string
            memory description = '"description": "This NFT changes mood based of how much eth you give it"';
        string memory attributes = '"attributes": "[{"trait_type": "freshness", "value": 100}]"';

        return
            string(
                abi.encodePacked(
                    _baseURI(),
                    Base64.encode(
                        bytes(
                            string(
                                abi.encodePacked(
                                    "{",
                                    name,
                                    ",",
                                    description,
                                    ",",
                                    image,
                                    ",",
                                    description,
                                    ",",
                                    attributes,
                                    "}"
                                )
                            )
                        )
                    )
                )
            );
    }

    function getLowSVG() public view returns (string memory) {
        return i_lowImageUri;
    }

    function getHighSVG() public view returns (string memory) {
        return i_lowImageUri;
    }

    function getTokenCounter() public view returns (uint256) {
        return s_tokenCounter;
    }

    function getPriceFeed() public view returns (AggregatorV3Interface) {
        return i_priceFeed;
    }
}
