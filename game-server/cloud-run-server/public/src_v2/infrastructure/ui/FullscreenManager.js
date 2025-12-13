export class FullscreenManager {
  constructor() {
    this.btn = document.getElementById("btn-fullscreen-toggle");
    this.iconEnter = document.getElementById("icon-fullscreen-enter");
    this.iconExit = document.getElementById("icon-fullscreen-exit");
  }

  init() {
    if (this.btn) {
      // 【修正】touchstartを削除し、clickのみにする
      // Android Chrome等では click イベント内でないと全画面化が許可されない場合があるため
      this.btn.addEventListener("click", (e) => {
        // ボタンがフォーム送信などをしないように念のため
        e.preventDefault();
        this.toggle();
      });
    }

    const handleStateChange = () => this.updateIcon();
    document.addEventListener("fullscreenchange", handleStateChange);
    document.addEventListener("webkitfullscreenchange", handleStateChange);
    document.addEventListener("mozfullscreenchange", handleStateChange);
    document.addEventListener("MSFullscreenChange", handleStateChange);

    this.updateIcon();
  }

  request() {
    const doc = window.document;
    const docEl = doc.documentElement;

    if (this._isFullscreen()) return;

    const requestFullScreen =
      docEl.requestFullscreen ||
      docEl.webkitRequestFullScreen ||
      docEl.mozRequestFullScreen ||
      docEl.msRequestFullscreen;

    if (requestFullScreen) {
      // ユーザー操作（クリック）の直後でないと、このPromiseは拒否されることがある
      const promise = requestFullScreen.call(docEl);
      if (promise && typeof promise.catch === "function") {
        promise.catch((e) => {
          console.warn("Fullscreen request denied:", e);
        });
      }
    }
  }

  exit() {
    const doc = window.document;
    if (!this._isFullscreen()) return;

    const exit = 
      doc.exitFullscreen ||
      doc.webkitExitFullscreen ||
      doc.mozCancelFullScreen ||
      doc.msExitFullscreen;
      
    if (exit) {
      exit.call(doc).catch((err) => console.log(err));
    }
  }

  toggle() {
    if (this._isFullscreen()) {
      this.exit();
    } else {
      this.request();
    }
  }

  updateIcon() {
    const isFull = this._isFullscreen();

    if (this.iconEnter && this.iconExit) {
      if (isFull) {
        this.iconEnter.classList.add("hidden");
        this.iconExit.classList.remove("hidden");
      } else {
        this.iconEnter.classList.remove("hidden");
        this.iconExit.classList.add("hidden");
      }
    }
    
    // レイアウト再計算
    setTimeout(() => {
       window.dispatchEvent(new Event('resize'));
    }, 100);
  }

  _isFullscreen() {
    const doc = window.document;
    return !!(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );
  }
}