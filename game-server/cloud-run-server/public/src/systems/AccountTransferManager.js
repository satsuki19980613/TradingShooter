export class AccountTransferManager {
  constructor(uiManager) {
    this.uiManager = uiManager;
    
    // DOM要素の取得
    this.modalTransfer = document.getElementById("modal-transfer");
    this.recoverCodeInput = document.getElementById("recover-code-input");
    this.transferCodeDisplay = document.getElementById("transfer-code-display");
    
    // ボタン類
    this.btnMenuTransfer = document.getElementById("btn-menu-transfer");
    this.btnInitialTransfer = document.getElementById("btn-initial-goto-transfer");
    this.btnCloseTransfer = document.getElementById("btn-close-transfer");
    this.btnIssueCode = document.getElementById("btn-issue-code");
    this.btnDoRecover = document.getElementById("btn-do-recover");

    // 状態管理
    this.isTransferFromInitial = false;
  }

  /**
   * イベントリスナーの初期化
   * @param {Object} actions - AppFlowManagerから渡されるコールバック関数群
   */
  init(actions) {
    // 1. メニューから開く
    if (this.btnMenuTransfer) {
      this.btnMenuTransfer.addEventListener("click", () => {
        this.isTransferFromInitial = false;
        this.openModal(actions);
      });
    }

    // 2. 初回画面から開く
    if (this.btnInitialTransfer) {
      this.btnInitialTransfer.addEventListener("click", () => {
        this.isTransferFromInitial = true;
        this.openModal(actions);
      });
    }

    // 3. 閉じる
    if (this.btnCloseTransfer) {
      this.btnCloseTransfer.addEventListener("click", () => {
        this.closeModal();
      });
    }

    // 4. コード発行実行
    if (this.btnIssueCode) {
      this.btnIssueCode.addEventListener("click", () => {
        if (actions.onIssueCode) {
          // ボタンを連打できないように一時無効化する処理を入れると良い
          actions.onIssueCode();
        }
      });
    }

    // 5. 復旧実行
    if (this.btnDoRecover) {
      this.btnDoRecover.addEventListener("click", () => {
        const code = this.recoverCodeInput.value;
        if (!code) {
          alert("引継ぎコードを入力してください");
          return;
        }
        if (actions.onRecoverAccount) {
          actions.onRecoverAccount(code);
        }
      });
    }
  }

  openModal(actions) {
    this.modalTransfer.classList.remove("hidden");
    
    // UIの表示切り替え: 初回画面からの場合は「現在のデータを引き継ぐ（発行）」を隠す
    const issueSection = document.getElementById("transfer-code-display").parentElement;
    if (issueSection) {
        issueSection.style.display = this.isTransferFromInitial ? "none" : "block";
    }

    // サーバー接続が必要なら要求する (AppFlowManager経由)
    if (actions.onTransferRequest) {
      actions.onTransferRequest();
    }
  }

  closeModal() {
    this.modalTransfer.classList.add("hidden");
    // 入力欄をクリア
    if(this.recoverCodeInput) this.recoverCodeInput.value = "";
  }

  /**
   * 発行されたコードを画面に表示する
   */
  displayIssuedCode(code) {
    if (this.transferCodeDisplay) {
      this.transferCodeDisplay.textContent = code;
      // コピーしやすいように選択状態にする、またはアラートを出すなどのUX向上も可能
    }
  }
}