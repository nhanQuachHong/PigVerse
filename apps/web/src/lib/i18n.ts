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
  },
} as const;

export type MessageKey = keyof (typeof messages)["en"];

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function translate(locale: Locale, key: MessageKey): string {
  return messages[locale][key] ?? messages.en[key];
}
