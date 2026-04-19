const state = {
  racing: true,
  crashed: false,
  rewardViewed: false,
  carStart: { x: 164, y: 150 },
  carPos: { x: 164, y: 150 },
};

const statusEl = document.getElementById("status");
const carEl = document.getElementById("car");
const crashBtn = document.getElementById("crash-btn");

function renderCar() {
  carEl.style.left = `${state.carPos.x}px`;
  carEl.style.top = `${state.carPos.y}px`;
}

function resetCarPositionAndContinueRace() {
  state.carPos = { ...state.carStart };
  state.crashed = false;
  state.racing = true;
  renderCar();
  statusEl.textContent = "Reward earned. Car reset. Race continued.";
}

function onRewardDeclined() {
  state.racing = false;
  statusEl.textContent = "No reward earned. Race over after crash.";
}

function triggerCrashRewardedAd() {
  if (typeof window.adBreak !== "function") {
    // In local/dev environments the ad SDK may be unavailable, so reset car position and continue race for testability.
    resetCarPositionAndContinueRace();
    return;
  }

  state.rewardViewed = false;

  window.adBreak({
    type: "reward",
    name: "crash_continue",
    beforeReward: (showAdFn) => {
      showAdFn();
    },
    adViewed: () => {
      state.rewardViewed = true;
      resetCarPositionAndContinueRace();
    },
    adDismissed: () => {
      // Treat dismissal without adViewed as no reward (includes close/skip/load-failure cases).
      if (!state.rewardViewed) {
        onRewardDeclined();
      }
    },
  });
}

function onPlayerCrash() {
  if (!state.racing || state.crashed) return;
  state.crashed = true;
  statusEl.textContent = "Crash detected. Showing rewarded ad...";
  triggerCrashRewardedAd();
}

crashBtn.addEventListener("click", onPlayerCrash);
renderCar();
