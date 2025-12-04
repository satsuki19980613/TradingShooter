export class PlayerRegistrationManager {
  constructor(uiManager) {
    this.uiManager = uiManager;

    this.modalRegister = document.getElementById("modal-register");
    this.regNameInput = document.getElementById("reg-name-input");

    this.btnMenuRegister = document.getElementById("btn-menu-register");
    this.btnDoRegister = document.getElementById("btn-do-register");
    this.btnCloseRegister = document.getElementById("btn-close-register");
  }

  /**
   * イベントリスナーの初期化
   * @param {Object} actions - AppFlowManagerから渡されるコールバック群
   */
  init(actions) {
    if (this.btnMenuRegister) {
      this.btnMenuRegister.addEventListener("click", () => {
        this.openModal();
      });
    }

    if (this.btnCloseRegister) {
      this.btnCloseRegister.addEventListener("click", () => {
        this.closeModal();
      });
    }

    if (this.btnDoRegister) {
      this.btnDoRegister.addEventListener("click", () => {
        const name = this.regNameInput.value.trim();

        if (!name) return alert("名前を入力してください");
        if (name.length < 3 || name.length > 12) {
          return alert("名前は3文字以上12文字以下にしてください");
        }
        if (name.toLowerCase() === "guest") {
          return alert("その名前は使用できません");
        }

        if (actions.onRegisterName) {
          actions.onRegisterName(name);
        }
      });
    }
  }

  openModal() {
    if (this.modalRegister) {
      this.modalRegister.classList.remove("hidden");

      if (this.regNameInput) this.regNameInput.value = "";
    }
  }

  closeModal() {
    if (this.modalRegister) {
      this.modalRegister.classList.add("hidden");
    }
  }
}
