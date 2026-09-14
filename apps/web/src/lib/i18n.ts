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
    "admin.ownerControlsEyebrow": "FR-CONTRACT-001/002 · Chain trực tiếp",
    "admin.ownerControlsTitle": "Điều khiển mint của Owner",
    "admin.ownerControlsRefresh": "Đọc lại từ chain",
    "admin.ownerControlsMintState": "Trạng thái mint",
    "admin.ownerControlsCurrentPrice": "Giá mint hiện tại",
    "admin.ownerControlsBalance": "Số dư contract",
    "admin.ownerControlsUnknown": "Chưa xác định",
    "admin.ownerControlsActive": "Đang mở",
    "admin.ownerControlsPaused": "Đang tạm dừng",
    "admin.ownerControlsPause": "Tạm dừng mint",
    "admin.ownerControlsUnpause": "Mở lại mint",
    "admin.ownerControlsPauseHint":
      "Pause chỉ chặn giao dịch mint mới; nội dung công khai vẫn hiển thị.",
    "admin.ownerControlsNewPrice": "Giá mint mới · ETH",
    "admin.ownerControlsSetPrice": "Cập nhật giá on-chain",
    "admin.ownerControlsWithdrawHint":
      "Withdraw toàn bộ số dư về Owner hiện tại; không thể chọn địa chỉ nhận khác.",
    "admin.ownerControlsWithdraw": "Withdraw số dư",
    "admin.ownerControlsWithdrawConfirm":
      "Xác nhận gửi toàn bộ số dư contract về Owner:",
    "admin.ownerControlsWithdrawConfirmButton": "Xác nhận withdraw",
    "admin.ownerControlsWithdrawCancel": "Hủy",
    "admin.ownerControlsWrongWallet":
      "Kết nối đúng ví Owner của phiên để dùng contract controls.",
    "admin.ownerControlsChainError":
      "Không đọc được pause/price từ chain; thao tác đã bị khóa an toàn.",
    "admin.ownerControlsWalletError":
      "Ví từ chối hoặc giao dịch không thể gửi. Chain chưa được coi là đã thay đổi.",
    "admin.ownerControlsIncluded": "Giao dịch Owner đã included.",
    "admin.ownerControlsReceiptError":
      "Chưa thể xác định receipt từ RPC; không suy đoán thành công.",
    "admin.ownerControlsDone": "Hoàn tất",
    "admin.ownerControlsSubmitted":
      "Chỉ chain quyết định kết quả; trạng thái được đọc lại sau receipt thành công.",
    "admin.ownerControlsSafety":
      "Giao dịch được ký trực tiếp bởi ví Owner. Pigverse không nhận hoặc lưu private key.",
    "admin.workflowsPending": "Workflow quản trị đang được triển khai an toàn",
    "admin.workflowsPendingDescription":
      "Xử lý tài sản và withdraw sẽ chỉ xuất hiện khi có guard, audit và kiểm thử tương ứng.",
    "admin.editorEyebrow": "M9 · Nội dung Genesis",
    "admin.editorSectionTitle": "Bản nháp 10 nhân vật",
    "admin.editorRefresh": "Làm mới từ chain",
    "admin.editorTitle": "Nội dung song ngữ",
    "admin.editorRevision": "Revision",
    "admin.editorNoDraft": "chưa có draft",
    "admin.editorDraftHint":
      "Có thể lưu bản nháp chưa hoàn chỉnh. Cả VI và EN sẽ bắt buộc trước khi xử lý tài sản hoặc publish.",
    "admin.editorNameVi": "Tên · Tiếng Việt",
    "admin.editorNameEn": "Name · English",
    "admin.editorDescriptionVi": "Mô tả · Tiếng Việt",
    "admin.editorDescriptionEn": "Description · English",
    "admin.editorStoryVi": "Câu chuyện · Tiếng Việt",
    "admin.editorStoryEn": "Story · English",
    "admin.editorSave": "Lưu revision mới",
    "admin.editorSaving": "Đang kiểm tra chain và lưu…",
    "admin.editorSaved": "Đã lưu và ghi audit",
    "admin.editorLocked": "Token đã mint; nội dung được khóa bất biến.",
    "admin.editorChainUnavailable":
      "Không thể chứng minh token chưa mint. Chỉnh sửa bị khóa an toàn.",
    "admin.editorErrorStale":
      "Draft đã thay đổi ở nơi khác. Làm mới trước khi chỉnh sửa tiếp.",
    "admin.editorErrorMinted":
      "Token đã mint trong lúc chỉnh sửa. Không có thay đổi nào được lưu.",
    "admin.editorErrorChain":
      "Không đọc được chain nên thay đổi không được lưu. Vui lòng thử lại.",
    "admin.editorErrorGeneric":
      "Không thể lưu draft. Không có trạng thái thành công được tạo.",
    "admin.editorUnavailableTitle": "Không tải được nội dung Admin",
    "admin.editorUnavailable":
      "Database hoặc chain hiện không khả dụng. Hãy thử lại sau.",
    "admin.publicationEyebrow": "Publication on-chain",
    "admin.publicationTitle": "Công bố để mint",
    "admin.publicationReadyHint":
      "Backend kiểm tra asset package và revision trước khi ví Owner gửi giao dịch.",
    "admin.publicationNotReady":
      "Hoàn tất xử lý asset để đạt READY trước khi publish.",
    "admin.publicationContractMissing":
      "Contract Base Sepolia chưa được cấu hình an toàn.",
    "admin.publicationWrongWallet":
      "Kết nối đúng ví Owner của phiên để gửi giao dịch.",
    "admin.publicationWrongNetwork": "Chuyển ví sang Base Sepolia để tiếp tục.",
    "admin.publicationPublish": "Publish on-chain",
    "admin.publicationUnpublish": "Unpublish on-chain",
    "admin.publicationPreparing": "Đang kiểm tra và mở ví…",
    "admin.publicationPending": "Giao dịch đang chờ hoặc đang được đối soát.",
    "admin.publicationRecording": "Đang đối soát chain và ghi audit…",
    "admin.publicationPublished": "Publish đã được ghi nhận ở block included.",
    "admin.publicationUnpublished":
      "Unpublish đã được ghi nhận ở block included.",
    "admin.publicationViewTransaction": "Xem giao dịch",
    "admin.publicationRetryRecord": "Đối soát lại",
    "admin.publicationResetFailed": "Xóa giao dịch thất bại",
    "admin.publicationReceiptFailed": "Giao dịch đã revert on-chain.",
    "admin.publicationFinality":
      "Included không đồng nghĩa finality. Block hash được lưu để reconciliation phát hiện reorg.",
    "admin.publicationErrorAssets": "Asset package chưa COMPLETE.",
    "admin.publicationErrorMinted": "Token đã mint; thao tác bị từ chối.",
    "admin.publicationErrorConflict":
      "Publication hoặc content revision đã thay đổi. Hãy làm mới.",
    "admin.publicationErrorChain":
      "Không đọc được chain nên không ghi trạng thái thành công.",
    "admin.publicationErrorGeneric":
      "Không thể hoàn tất publication. Kiểm tra ví và thử lại.",
    "admin.auditEyebrow": "FR-ADMIN-004 · Audit append-only",
    "admin.auditTitle": "Lịch sử thay đổi",
    "admin.auditRefresh": "Làm mới audit",
    "admin.auditUnavailable":
      "Không tải được lịch sử audit. Không có dữ liệu nào được suy đoán.",
    "admin.auditEmpty": "Chưa có thay đổi quản trị nào được ghi nhận.",
    "admin.auditLoadMore": "Tải lịch sử cũ hơn",
    "admin.auditLoadingMore": "Đang tải…",
    "admin.auditRevision": "revision",
    "admin.auditActionDraft": "Cập nhật bản nháp",
    "admin.auditActionPublished": "Publish nội dung",
    "admin.auditActionUnpublished": "Unpublish nội dung",
    "admin.auditActionOther": "Thao tác quản trị",
    "admin.activityEyebrow": "FR-ADMIN-005 · Chain reconciliation",
    "admin.activityTitle": "Hoạt động mint",
    "admin.activityRefresh": "Đối soát lại",
    "admin.activityDescription":
      "Projection vận hành được kiểm tra lại từ Base Sepolia; ownership hiện tại luôn do chain quyết định.",
    "admin.activityUnavailable":
      "Không thể tải hoặc đối soát hoạt động mint lúc này.",
    "admin.activityEmpty": "Chưa ghi nhận giao dịch mint nào.",
    "admin.activityLoadMore": "Tải hoạt động cũ hơn",
    "admin.activityLoadingMore": "Đang tải…",
    "admin.activitySucceeded": "Đã included",
    "admin.activityReverted": "Đã revert",
    "admin.activityPending": "Đang chờ",
    "admin.activityUnknown": "Chưa xác định",
    "admin.activityBlock": "Block",
    "admin.activityNoBlock": "Chưa có block",
    "admin.activityReconciliationUnavailable": "Chưa đối soát được",
    "admin.chain.minted": "Đã mint · khóa",
    "admin.chain.unminted": "Chưa mint · có thể sửa",
    "admin.chain.unavailable": "Chain chưa xác định",
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
    "admin.ownerControlsEyebrow": "FR-CONTRACT-001/002 · Direct chain",
    "admin.ownerControlsTitle": "Owner mint controls",
    "admin.ownerControlsRefresh": "Read from chain",
    "admin.ownerControlsMintState": "Mint state",
    "admin.ownerControlsCurrentPrice": "Current mint price",
    "admin.ownerControlsBalance": "Contract balance",
    "admin.ownerControlsUnknown": "Unknown",
    "admin.ownerControlsActive": "Active",
    "admin.ownerControlsPaused": "Paused",
    "admin.ownerControlsPause": "Pause minting",
    "admin.ownerControlsUnpause": "Unpause minting",
    "admin.ownerControlsPauseHint":
      "Pause blocks only new mint transactions; public content stays visible.",
    "admin.ownerControlsNewPrice": "New mint price · ETH",
    "admin.ownerControlsSetPrice": "Update price on-chain",
    "admin.ownerControlsWithdrawHint":
      "Withdraw the full balance to the current Owner; no alternate recipient can be entered.",
    "admin.ownerControlsWithdraw": "Withdraw balance",
    "admin.ownerControlsWithdrawConfirm":
      "Confirm sending the full contract balance to Owner:",
    "admin.ownerControlsWithdrawConfirmButton": "Confirm withdrawal",
    "admin.ownerControlsWithdrawCancel": "Cancel",
    "admin.ownerControlsWrongWallet":
      "Connect the session Owner wallet to use contract controls.",
    "admin.ownerControlsChainError":
      "Pause or price could not be read from chain, so controls are safely locked.",
    "admin.ownerControlsWalletError":
      "The wallet rejected or could not submit the transaction. Chain state is not treated as changed.",
    "admin.ownerControlsIncluded": "The Owner transaction was included.",
    "admin.ownerControlsReceiptError":
      "The RPC receipt cannot be resolved; success is not inferred.",
    "admin.ownerControlsDone": "Done",
    "admin.ownerControlsSubmitted":
      "Only the chain decides the outcome; state is read again after a successful receipt.",
    "admin.ownerControlsSafety":
      "The Owner wallet signs directly. Pigverse never receives or stores a private key.",
    "admin.workflowsPending": "Admin workflows are being built safely",
    "admin.workflowsPendingDescription":
      "Asset processing and withdrawal will appear only with matching guards, audit records and tests.",
    "admin.editorEyebrow": "M9 · Genesis content",
    "admin.editorSectionTitle": "Ten character drafts",
    "admin.editorRefresh": "Refresh from chain",
    "admin.editorTitle": "Bilingual content",
    "admin.editorRevision": "Revision",
    "admin.editorNoDraft": "no draft",
    "admin.editorDraftHint":
      "Incomplete drafts may be saved. Both VI and EN will be required before asset processing or publication.",
    "admin.editorNameVi": "Name · Vietnamese",
    "admin.editorNameEn": "Name · English",
    "admin.editorDescriptionVi": "Description · Vietnamese",
    "admin.editorDescriptionEn": "Description · English",
    "admin.editorStoryVi": "Story · Vietnamese",
    "admin.editorStoryEn": "Story · English",
    "admin.editorSave": "Save new revision",
    "admin.editorSaving": "Checking chain and saving…",
    "admin.editorSaved": "Saved with an audit record",
    "admin.editorLocked":
      "This token is minted; its content is immutably locked.",
    "admin.editorChainUnavailable":
      "The token cannot be proven unminted. Editing is safely locked.",
    "admin.editorErrorStale":
      "This draft changed elsewhere. Refresh before editing further.",
    "admin.editorErrorMinted":
      "The token minted while you were editing. No change was saved.",
    "admin.editorErrorChain":
      "Chain state is unavailable, so the change was not saved. Try again.",
    "admin.editorErrorGeneric":
      "The draft could not be saved. No success state was created.",
    "admin.editorUnavailableTitle": "Admin content unavailable",
    "admin.editorUnavailable":
      "The database or chain is currently unavailable. Please try again.",
    "admin.publicationEyebrow": "On-chain publication",
    "admin.publicationTitle": "Publish for minting",
    "admin.publicationReadyHint":
      "The backend verifies the asset package and revision before the Owner wallet sends a transaction.",
    "admin.publicationNotReady":
      "Complete asset processing and reach READY before publishing.",
    "admin.publicationContractMissing":
      "The Base Sepolia contract is not safely configured.",
    "admin.publicationWrongWallet":
      "Connect the session Owner wallet to send the transaction.",
    "admin.publicationWrongNetwork":
      "Switch the wallet to Base Sepolia to continue.",
    "admin.publicationPublish": "Publish on-chain",
    "admin.publicationUnpublish": "Unpublish on-chain",
    "admin.publicationPreparing": "Checking state and opening wallet…",
    "admin.publicationPending":
      "The transaction is pending or awaiting reconciliation.",
    "admin.publicationRecording": "Reconciling chain state and audit…",
    "admin.publicationPublished": "Publish recorded at an included block.",
    "admin.publicationUnpublished": "Unpublish recorded at an included block.",
    "admin.publicationViewTransaction": "View transaction",
    "admin.publicationRetryRecord": "Reconcile again",
    "admin.publicationResetFailed": "Clear failed transaction",
    "admin.publicationReceiptFailed": "The transaction reverted on-chain.",
    "admin.publicationFinality":
      "Included does not mean final. The block hash is retained so reconciliation can detect a reorg.",
    "admin.publicationErrorAssets": "The asset package is not COMPLETE.",
    "admin.publicationErrorMinted":
      "The token is already minted, so the action was rejected.",
    "admin.publicationErrorConflict":
      "The publication or content revision changed. Refresh and try again.",
    "admin.publicationErrorChain":
      "Chain state is unavailable, so no success state was recorded.",
    "admin.publicationErrorGeneric":
      "Publication could not be completed. Check the wallet and try again.",
    "admin.auditEyebrow": "FR-ADMIN-004 · Append-only audit",
    "admin.auditTitle": "Change history",
    "admin.auditRefresh": "Refresh audit",
    "admin.auditUnavailable":
      "Audit history is unavailable. No history is inferred.",
    "admin.auditEmpty": "No Admin changes have been recorded yet.",
    "admin.auditLoadMore": "Load older history",
    "admin.auditLoadingMore": "Loading…",
    "admin.auditRevision": "revision",
    "admin.auditActionDraft": "Draft updated",
    "admin.auditActionPublished": "Content published",
    "admin.auditActionUnpublished": "Content unpublished",
    "admin.auditActionOther": "Admin action",
    "admin.activityEyebrow": "FR-ADMIN-005 · Chain reconciliation",
    "admin.activityTitle": "Mint activity",
    "admin.activityRefresh": "Reconcile again",
    "admin.activityDescription":
      "This operational projection is rechecked against Base Sepolia; current ownership is always decided by the chain.",
    "admin.activityUnavailable":
      "Mint activity cannot be loaded or reconciled right now.",
    "admin.activityEmpty": "No mint transactions have been observed yet.",
    "admin.activityLoadMore": "Load older activity",
    "admin.activityLoadingMore": "Loading…",
    "admin.activitySucceeded": "Included",
    "admin.activityReverted": "Reverted",
    "admin.activityPending": "Pending",
    "admin.activityUnknown": "Unknown",
    "admin.activityBlock": "Block",
    "admin.activityNoBlock": "No block yet",
    "admin.activityReconciliationUnavailable": "Not currently reconciled",
    "admin.chain.minted": "Minted · locked",
    "admin.chain.unminted": "Unminted · editable",
    "admin.chain.unavailable": "Chain unavailable",
  },
} as const;

export type MessageKey = keyof (typeof messages)["en"];

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function translate(locale: Locale, key: MessageKey): string {
  return messages[locale][key] ?? messages.en[key];
}
