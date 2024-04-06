// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.20;

// import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
// import "@openzeppelin/contracts/interfaces/IERC20Metadata.sol";

// contract XERC20 is Initializable, IERC20Metadata {
//     mapping(address => uint) public wards;

//     function rely(address guy) external auth {
//         wards[guy] = 1;
//     }

//     function deny(address guy) external auth {
//         wards[guy] = 0;
//     }

//     modifier auth() {
//         require(wards[msg.sender] == 1, "XERC20/not-authorized");
//         _;
//     }

//     // --- ERC20 Data ---
//     string private _name;
//     string private _symbol;
//     string public constant version = "1";
//     uint8 public constant decimals = 18;
//     uint256 public totalSupply;

//     mapping(address => uint) public balanceOf;
//     mapping(address => mapping(address => uint)) public allowance;

//     function initialize(
//         string memory name_,
//         string memory symbol_
//     ) external initializer {
//         wards[msg.sender] = 1;
//         _name = name_;
//         _symbol = symbol_;
//     }

//     function name() public view virtual override returns (string memory) {
//         return _name;
//     }

//     function symbol() public view virtual override returns (string memory) {
//         return _symbol;
//     }

//     // --- XERC20 ---
//     function transfer(address dst, uint wad) external returns (bool) {
//         return transferFrom(msg.sender, dst, wad);
//     }

//     function transferFrom(
//         address src,
//         address dst,
//         uint wad
//     ) public returns (bool) {
//         require(src != address(0), "XERC20/transfer-from-zero-address");
//         require(dst != address(0), "XERC20/transfer-to-zero-address");
//         require(balanceOf[src] >= wad, "XERC20/insufficient-balance");
//         if (
//             src != msg.sender && allowance[src][msg.sender] != type(uint256).max
//         ) {
//             require(
//                 allowance[src][msg.sender] >= wad,
//                 "XERC20/insufficient-allowance"
//             );
//             allowance[src][msg.sender] -= wad;
//         }
//         balanceOf[src] -= wad;
//         balanceOf[dst] += wad;
//         emit Transfer(src, dst, wad);
//         return true;
//     }

//     function mint(address usr, uint wad) external auth {
//         require(usr != address(0), "XERC20/mint-to-zero-address");
//         balanceOf[usr] += wad;
//         totalSupply += wad;
//         emit Transfer(address(0), usr, wad);
//     }

//     function burn(address usr, uint wad) external {
//         require(usr != address(0), "XERC20/burn-from-zero-address");
//         require(balanceOf[usr] >= wad, "XERC20/insufficient-balance");
//         if (
//             usr != msg.sender && allowance[usr][msg.sender] != type(uint256).max
//         ) {
//             require(
//                 allowance[usr][msg.sender] >= wad,
//                 "XERC20/insufficient-allowance"
//             );
//             allowance[usr][msg.sender] -= wad;
//         }
//         balanceOf[usr] -= wad;
//         totalSupply -= wad;
//         emit Transfer(usr, address(0), wad);
//     }

//     function approve(address usr, uint wad) external returns (bool) {
//         _approve(msg.sender, usr, wad);

//         emit Approval(msg.sender, usr, wad);
//         return true;
//     }

//     function _approve(
//         address owner,
//         address spender,
//         uint256 amount
//     ) internal virtual {
//         require(owner != address(0), "XERC20/approve-from-zero-address");
//         require(spender != address(0), "XERC20/approve-to-zero-address");

//         allowance[owner][spender] = amount;
//         emit Approval(owner, spender, amount);
//     }

//     function increaseAllowance(
//         address spender,
//         uint256 addedValue
//     ) public returns (bool) {
//         address owner = msg.sender;
//         _approve(owner, spender, allowance[owner][spender] + addedValue);
//         return true;
//     }

//     function decreaseAllowance(
//         address spender,
//         uint256 subtractedValue
//     ) public returns (bool) {
//         address owner = msg.sender;
//         uint256 currentAllowance = allowance[owner][spender];
//         require(
//             currentAllowance >= subtractedValue,
//             "XERC20/decreased-allowance-below-zero"
//         );
//         unchecked {
//             _approve(owner, spender, currentAllowance - subtractedValue);
//         }
//         return true;
//     }

//     // Test Function
//     function mintMe() external {
//         balanceOf[msg.sender] += 1e17;
//         totalSupply += 1e17;
//         emit Transfer(address(0), msg.sender, 1e17);
//     }
// }
