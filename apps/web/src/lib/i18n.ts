export const locales = ["vi", "en"] as const;

export type Locale = (typeof locales)[number];

const messages = {
  vi: {
    "nav.home": "Trang chủ",
    "nav.collection": "Bộ sưu tập",
    "nav.story": "Câu chuyện",
    "nav.myNfts": "NFT của tôi",
    "nav.open": "Mở menu",
    "nav.close": "Đóng menu",
    "wallet.connect": "Kết nối ví",
    "wallet.connected": "Đã kết nối",
    "wallet.wrongNetwork": "Sai mạng",
    "wallet.choose": "Chọn ví",
    "wallet.connectDescription":
      "Pigverse chỉ yêu cầu quyền xem địa chỉ ví. Chúng tôi không bao giờ yêu cầu private key hoặc seed phrase.",
    "wallet.connectedTitle": "Ví đã kết nối",
    "wallet.connectedDescription": "Thông tin kết nối hiện tại của bạn.",
    "wallet.disconnect": "Ngắt kết nối",
    "wallet.error": "Không thể hoàn tất yêu cầu ví. Vui lòng thử lại.",
    "wallet.switchNetwork": "Chuyển sang Base Sepolia",
    "wallet.switching": "Đang chuyển mạng…",
    "wallet.wrongNetworkDescription":
      "Ví đang ở sai mạng. Hãy chuyển sang Base Sepolia trước khi tiếp tục.",
    "wallet.address": "Địa chỉ",
    "wallet.network": "Mạng",
    "wallet.unsupportedNetwork": "Mạng không hỗ trợ",
    "foundation.eyebrow": "M1 · Nền tảng giao diện",
    "foundation.title": "Một ngôn ngữ thiết kế cho toàn bộ Pigverse.",
    "foundation.description":
      "Shell, token và component dùng chung đã sẵn sàng trước khi xây từng màn hình sản phẩm.",
    "foundation.preview": "Thư viện component",
    "foundation.states": "Trạng thái sản phẩm",
    "foundation.forms": "Form và phản hồi",
    "status.available": "Có thể mint",
    "status.minted": "Đã mint",
    "status.minting": "Đang mint",
    "status.comingSoon": "Sắp ra mắt",
    "status.paused": "Tạm dừng",
    "status.unknown": "Chưa xác định",
    "state.empty.title": "Chưa có NFT",
    "state.empty.description":
      "Bộ sưu tập của bạn đang chờ chuyến phiêu lưu đầu tiên.",
    "state.error.title": "Ôi! Có điều gì đó chưa ổn.",
    "state.error.description": "Hãy thử lại sau một chút.",
    "common.explore": "Khám phá bộ sưu tập",
    "common.retry": "Thử lại",
    "common.close": "Đóng",
    "admin.header": "Quản trị Pigverse",
    "admin.navDashboard": "Tổng quan",
    "admin.navNfts": "Quản lý NFT",
    "admin.navAssets": "Xử lý tài sản",
    "admin.navMinting": "Minting",
    "admin.navSettings": "Cài đặt",
    "admin.navLabel": "Điều hướng quản trị",
    "admin.navOpen": "Mở điều hướng quản trị",
    "admin.navClose": "Đóng điều hướng quản trị",
    "admin.secureAccess": "Quyền truy cập Owner/Admin",
    "admin.signInTitle": "Xác minh ví quản trị",
    "admin.signInDescription":
      "Kết nối ví Owner hiện tại và ký thông điệp dùng một lần để mở phiên quản trị bảo mật.",
    "admin.stepsLabel": "Các bước xác thực",
    "admin.stepConnect": "Kết nối ví",
    "admin.stepSign": "Ký thông điệp",
    "admin.stepVerify": "Xác minh Owner từ chain",
    "admin.signMessage": "Ký để đăng nhập",
    "admin.signingIn": "Đang xác minh…",
    "admin.noTransaction":
      "Chữ ký này không gửi giao dịch và không tốn phí gas. Pigverse không bao giờ yêu cầu private key hoặc seed phrase.",
    "admin.unavailable":
      "Xác thực Admin hiện chưa khả dụng. Cần cấu hình contract, RPC, database và app origin ở phía server.",
    "admin.error":
      "Không thể xác thực quyền Admin. Hãy kiểm tra ví Owner, mạng và thử lại.",
    "admin.ownerVerified": "Owner đã được xác minh on-chain",
    "admin.dashboardTitle": "Admin Dashboard",
    "admin.dashboardDescription":
      "Phiên này được kiểm tra lại với Owner hiện tại của contract.",
    "admin.signOut": "Đăng xuất",
    "admin.accountMismatch":
      "Ví đang kết nối khác với ví Owner của phiên. Hãy kết nối lại ví Owner trước khi thực hiện giao dịch contract.",
    "admin.genesisSupply": "Tổng cung Genesis",
    "admin.identityRule": "Mỗi nhân vật là duy nhất",
    "admin.activeNetwork": "Mạng mục tiêu",
    "admin.currentOwner": "Owner hiện tại",
    "admin.workflowsPending": "Workflow quản trị đang được triển khai an toàn",
    "admin.workflowsPendingDescription":
      "Quản lý nội dung, publish, pause, giá mint và withdraw sẽ chỉ xuất hiện khi API có guard phiên, audit log và kiểm thử tương ứng.",
  },
  en: {
    "nav.home": "Home",
    "nav.collection": "Collection",
    "nav.story": "Story",
    "nav.myNfts": "My NFTs",
    "nav.open": "Open menu",
    "nav.close": "Close menu",
    "wallet.connect": "Connect Wallet",
    "wallet.connected": "Connected",
    "wallet.wrongNetwork": "Wrong network",
    "wallet.choose": "Choose a wallet",
    "wallet.connectDescription":
      "Pigverse only requests permission to view your wallet address. We never ask for a private key or seed phrase.",
    "wallet.connectedTitle": "Wallet connected",
    "wallet.connectedDescription": "Your current connection details.",
    "wallet.disconnect": "Disconnect",
    "wallet.error":
      "The wallet request could not be completed. Please try again.",
    "wallet.switchNetwork": "Switch to Base Sepolia",
    "wallet.switching": "Switching network…",
    "wallet.wrongNetworkDescription":
      "Your wallet is on the wrong network. Switch to Base Sepolia to continue.",
    "wallet.address": "Address",
    "wallet.network": "Network",
    "wallet.unsupportedNetwork": "Unsupported network",
    "foundation.eyebrow": "M1 · Frontend foundation",
    "foundation.title": "One design language for every Pigverse experience.",
    "foundation.description":
      "Shared shells, tokens and components are ready before product pages are built.",
    "foundation.preview": "Component gallery",
    "foundation.states": "Product states",
    "foundation.forms": "Forms and feedback",
    "status.available": "Available",
    "status.minted": "Minted",
    "status.minting": "Minting",
    "status.comingSoon": "Coming soon",
    "status.paused": "Paused",
    "status.unknown": "Status unavailable",
    "state.empty.title": "No NFTs yet",
    "state.empty.description":
      "Your collection is waiting for its first adventure.",
    "state.error.title": "Oops! Something went wrong.",
    "state.error.description": "Please try again in a moment.",
    "common.explore": "Explore Collection",
    "common.retry": "Try again",
    "common.close": "Close",
    "admin.header": "Pigverse Admin",
    "admin.navDashboard": "Dashboard",
    "admin.navNfts": "NFT Management",
    "admin.navAssets": "Asset Processing",
    "admin.navMinting": "Minting",
    "admin.navSettings": "Settings",
    "admin.navLabel": "Admin navigation",
    "admin.navOpen": "Open admin navigation",
    "admin.navClose": "Close admin navigation",
    "admin.secureAccess": "Owner/Admin access",
    "admin.signInTitle": "Verify the Admin wallet",
    "admin.signInDescription":
      "Connect the current Owner wallet and sign a one-time message to open a secure Admin session.",
    "admin.stepsLabel": "Authentication steps",
    "admin.stepConnect": "Connect wallet",
    "admin.stepSign": "Sign message",
    "admin.stepVerify": "Verify Owner on-chain",
    "admin.signMessage": "Sign in with wallet",
    "admin.signingIn": "Verifying…",
    "admin.noTransaction":
      "This signature sends no transaction and costs no gas. Pigverse never asks for a private key or seed phrase.",
    "admin.unavailable":
      "Admin authentication is not available yet. Server-side contract, RPC, database and app-origin configuration are required.",
    "admin.error":
      "Admin access could not be verified. Check the Owner wallet and network, then try again.",
    "admin.ownerVerified": "Owner verified on-chain",
    "admin.dashboardTitle": "Admin Dashboard",
    "admin.dashboardDescription":
      "This session is revalidated against the contract's current Owner.",
    "admin.signOut": "Sign out",
    "admin.accountMismatch":
      "The connected wallet differs from the session Owner. Reconnect the Owner wallet before sending contract transactions.",
    "admin.genesisSupply": "Genesis total supply",
    "admin.identityRule": "Each character is unique",
    "admin.activeNetwork": "Target network",
    "admin.currentOwner": "Current Owner",
    "admin.workflowsPending": "Admin workflows are being built safely",
    "admin.workflowsPendingDescription":
      "Content management, publishing, pause, mint price and withdrawal controls will appear only with guarded APIs, audit records and matching tests.",
  },
} as const;

export type MessageKey = keyof (typeof messages)["en"];

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function translate(locale: Locale, key: MessageKey): string {
  return messages[locale][key] ?? messages.en[key];
}
