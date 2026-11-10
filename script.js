document.addEventListener("DOMContentLoaded", function () {
    const display = document.getElementById("display");
    const grid = document.getElementById("grid");
    const previousNumbersContainer = document.getElementById("previous-numbers");
    const previousSubtitle = document.getElementById("previous-subtitle");
    const menuToggle = document.getElementById("menu-toggle");
    const previousPanel = document.getElementById("previous-panel");
    const createGameToggle = document.getElementById("create-game-toggle");
    const createGamePanel = document.getElementById("create-game-panel");
    const resetGameBtn = document.getElementById("reset-game-btn");
    const peopleCountInput = document.getElementById("people-count");
    const amountPpInput = document.getElementById("amount-pp");
    const winningCountInput = document.getElementById("winning-count");
    const totalPoolValue = document.getElementById("total-pool-value");
    const mainWinnerValue = document.getElementById("main-winner-value");
    const otherWinnersCountEl = document.getElementById("other-winners-count");
    const otherWinnersValue = document.getElementById("other-winners-value");
    const autoSplitBtn = document.getElementById("auto-split-btn");
    const equalSplitBtn = document.getElementById("equal-split-btn");
    const prizeTypesList = document.getElementById("prize-types-list");
    const customTypeForm = document.getElementById("custom-type-form");
    const customTypeInput = document.getElementById("custom-type-input");
    const addCustomTypeBtn = document.getElementById("add-custom-type-btn");
    const allocationNote = document.getElementById("allocation-note");
    const ticketForm = document.getElementById("ticket-form");
    const ticketInput = document.getElementById("ticket-input");
    const checkTicketBtn = document.getElementById("check-ticket-btn");
    const clearTicketBtn = document.getElementById("clear-ticket-btn");
    const ticketStatus = document.getElementById("ticket-status");
    const ticketEntriesContainer = document.getElementById("ticket-entries");
    const delayButtons = document.querySelectorAll(".delay-btn");
    const customDelayInput = document.getElementById("custom-delay-input");
    const autoStartBtn = document.getElementById("auto-start-btn");
    const autoStopBtn = document.getElementById("auto-stop-btn");
    const MAX_PREVIOUS = 5;
    let generatedNumbers = new Set();
    let numberHistory = [];
    let checkedTicketNumbers = new Set();
    let autoDelaySeconds = 3;
    let autoIntervalId = null;
    let autoRemainingSeconds = 0;

    let splitMode = "auto";
    const prizeTypes = [
        { id: "full-house", name: "Full House (Winner)", weight: 35, pct: 35, checked: true, isMain: true },
        { id: "first-line", name: "First Line", weight: 15, pct: 15, checked: true, isMain: false },
        { id: "mid-line", name: "Mid Line", weight: 15, pct: 15, checked: true, isMain: false },
        { id: "last-line", name: "Last Line", weight: 15, pct: 15, checked: true, isMain: false },
        { id: "top-5", name: "Top 5 (Early 5)", weight: 10, pct: 10, checked: true, isMain: false },
        { id: "top-3", name: "Top 3 (Quick 3)", weight: 10, pct: 10, checked: true, isMain: false },
        { id: "top-7", name: "Top 7 (Early 7)", weight: 12, pct: 0, checked: false, isMain: false },
        { id: "four-corners", name: "Four Corners", weight: 10, pct: 0, checked: false, isMain: false },
        { id: "star", name: "Star", weight: 12, pct: 0, checked: false, isMain: false },
        { id: "second-house", name: "2nd Full House", weight: 20, pct: 0, checked: false, isMain: false },
    ];

    function setPanelOpen(isOpen) {
        previousPanel.hidden = !isOpen;
        menuToggle.setAttribute("aria-expanded", String(isOpen));
        if (!isOpen) {
            ticketInput.blur();
        }
    }

    function setCreatePanelOpen(isOpen) {
        createGamePanel.hidden = !isOpen;
        createGameToggle.setAttribute("aria-expanded", String(isOpen));
        if (!isOpen) {
            for (const el of createGamePanel.querySelectorAll("input")) {
                el.blur();
            }
        }
    }

    menuToggle.addEventListener("click", function () {
        setPanelOpen(previousPanel.hidden);
        // Release focus so subsequent Spacebar presses draw numbers instead of clicking this button
        menuToggle.blur();
    });

    createGameToggle.addEventListener("click", function () {
        setCreatePanelOpen(createGamePanel.hidden);
        createGameToggle.blur();
    });

    function formatAmount(value) {
        const rounded = Math.round(value * 100) / 100;
        return rounded.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }

    function syncSplitButtons() {
        autoSplitBtn.classList.toggle("active", splitMode === "auto");
        equalSplitBtn.classList.toggle("active", splitMode === "equal");
    }

    function computePrizes() {
        const people = Math.max(0, Number(peopleCountInput.value) || 0);
        const amountPp = Math.max(0, Number(amountPpInput.value) || 0);
        const totalPool = Math.round(people * amountPp * 100) / 100;
        const activeItems = prizeTypes.filter((item) => item.checked);

        const payouts = new Map();
        const percentages = new Map();

        if (activeItems.length > 0) {
            if (splitMode === "equal") {
                const pctEach = 100 / activeItems.length;
                let sumRounded = 0;
                for (const item of activeItems) {
                    const amt = Math.round((totalPool / activeItems.length) * 100) / 100;
                    payouts.set(item.id, amt);
                    percentages.set(item.id, pctEach);
                    item.pct = Number(pctEach.toFixed(2));
                    sumRounded += amt;
                }
                const diff = Math.round((totalPool - sumRounded) * 100) / 100;
                if (diff !== 0) {
                    const first = activeItems[0];
                    payouts.set(first.id, Math.round((payouts.get(first.id) + diff) * 100) / 100);
                }
            } else if (splitMode === "auto") {
                const totalWeight = activeItems.reduce((sum, item) => sum + item.weight, 0);
                let sumRounded = 0;
                for (const item of activeItems) {
                    const ratio = totalWeight > 0 ? item.weight / totalWeight : 1 / activeItems.length;
                    const amt = Math.round(totalPool * ratio * 100) / 100;
                    const pct = ratio * 100;
                    payouts.set(item.id, amt);
                    percentages.set(item.id, pct);
                    item.pct = Number(pct.toFixed(2));
                    sumRounded += amt;
                }
                const diff = Math.round((totalPool - sumRounded) * 100) / 100;
                if (diff !== 0) {
                    const first = activeItems[0];
                    payouts.set(first.id, Math.round((payouts.get(first.id) + diff) * 100) / 100);
                }
            } else {
                for (const item of activeItems) {
                    const pct = Math.max(0, Number(item.pct) || 0);
                    const amt = Math.round((totalPool * pct / 100) * 100) / 100;
                    payouts.set(item.id, amt);
                    percentages.set(item.id, pct);
                }
            }
        }

        return { totalPool, activeItems, payouts, percentages };
    }

    function updatePrizeCalculations() {
        const { totalPool, activeItems, payouts, percentages } = computePrizes();
        winningCountInput.max = String(prizeTypes.length);
        if (document.activeElement !== winningCountInput) {
            winningCountInput.value = String(activeItems.length);
        }

        totalPoolValue.textContent = formatAmount(totalPool);

        let mainItem = activeItems.find((item) => item.isMain) || activeItems[0] || null;
        const mainAmt = mainItem ? (payouts.get(mainItem.id) || 0) : 0;
        const otherItems = activeItems.filter((item) => item !== mainItem);
        const othersAmt = otherItems.reduce((sum, item) => sum + (payouts.get(item.id) || 0), 0);

        mainWinnerValue.textContent = formatAmount(mainAmt);
        otherWinnersCountEl.textContent = String(otherItems.length);
        otherWinnersValue.textContent = formatAmount(othersAmt);

        const rows = prizeTypesList.querySelectorAll(".prize-row");
        for (const row of rows) {
            const id = row.dataset.id;
            const item = prizeTypes.find((entry) => entry.id === id);
            if (!item) continue;

            const pctInput = row.querySelector(".prize-pct-input");
            const amtEl = row.querySelector(".prize-amount");

            row.classList.toggle("active", item.checked);
            pctInput.disabled = !item.checked;

            if (item.checked) {
                if (splitMode !== "custom" && document.activeElement !== pctInput) {
                    pctInput.value = String(Number((percentages.get(id) || 0).toFixed(1)));
                }
                amtEl.textContent = formatAmount(payouts.get(id) || 0);
            } else {
                if (document.activeElement !== pctInput) {
                    pctInput.value = "0";
                }
                amtEl.textContent = "0";
            }
        }

        if (activeItems.length === 0) {
            allocationNote.textContent = "Select at least 1 winning type";
            allocationNote.classList.add("warning");
        } else if (splitMode === "custom") {
            const totalPct = activeItems.reduce((sum, item) => sum + (Math.max(0, Number(item.pct) || 0)), 0);
            const roundedPct = Math.round(totalPct * 10) / 10;
            const remainingPct = Math.round((100 - roundedPct) * 10) / 10;
            if (Math.abs(remainingPct) <= 0.1) {
                allocationNote.textContent = "100% allocated";
                allocationNote.classList.remove("warning");
            } else {
                allocationNote.textContent = `Allocated: ${roundedPct}% (${remainingPct > 0 ? `${remainingPct}% left` : `${Math.abs(remainingPct)}% over`})`;
                allocationNote.classList.add("warning");
            }
        } else {
            allocationNote.textContent = `100% split across ${activeItems.length} winner${activeItems.length === 1 ? "" : "s"}`;
            allocationNote.classList.remove("warning");
        }

        syncSplitButtons();
    }

    function renderPrizeList() {
        prizeTypesList.innerHTML = "";
        for (const item of prizeTypes) {
            const row = document.createElement("div");
            row.className = "prize-row";
            if (item.isMain) {
                row.classList.add("main-winner");
            }
            if (item.checked) {
                row.classList.add("active");
            }
            row.dataset.id = item.id;

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = "prize-checkbox";
            checkbox.checked = item.checked;
            checkbox.setAttribute("aria-label", `Enable ${item.name}`);

            const nameSpan = document.createElement("span");
            nameSpan.className = "prize-name";
            nameSpan.textContent = item.name;
            nameSpan.title = item.name;

            const pctWrap = document.createElement("div");
            pctWrap.className = "prize-pct-wrap";

            const pctInput = document.createElement("input");
            pctInput.type = "number";
            pctInput.className = "prize-pct-input";
            pctInput.min = "0";
            pctInput.max = "100";
            pctInput.step = "any";
            pctInput.value = item.checked ? String(item.pct) : "0";
            pctInput.disabled = !item.checked;
            pctInput.setAttribute("aria-label", `${item.name} percentage`);

            const pctSymbol = document.createElement("span");
            pctSymbol.className = "prize-pct-symbol";
            pctSymbol.textContent = "%";

            pctWrap.appendChild(pctInput);
            pctWrap.appendChild(pctSymbol);

            const amtSpan = document.createElement("span");
            amtSpan.className = "prize-amount";
            amtSpan.textContent = "0";

            checkbox.addEventListener("change", function () {
                item.checked = checkbox.checked;
                if (splitMode === "custom" && item.checked && item.pct === 0) {
                    item.pct = 10;
                    pctInput.value = "10";
                }
                checkbox.blur();
                updatePrizeCalculations();
            });

            pctInput.addEventListener("input", function () {
                splitMode = "custom";
                item.pct = Math.max(0, Number(pctInput.value) || 0);
                updatePrizeCalculations();
            });

            row.appendChild(checkbox);
            row.appendChild(nameSpan);
            row.appendChild(pctWrap);
            row.appendChild(amtSpan);
            prizeTypesList.appendChild(row);
        }

        updatePrizeCalculations();
    }

    peopleCountInput.addEventListener("input", updatePrizeCalculations);
    amountPpInput.addEventListener("input", updatePrizeCalculations);

    winningCountInput.addEventListener("input", function () {
        if (winningCountInput.value.trim() === "") return;
        const raw = Number(winningCountInput.value);
        if (!Number.isFinite(raw)) return;
        const count = Math.max(0, Math.min(prizeTypes.length, Math.floor(raw)));
        prizeTypes.forEach((item, index) => {
            item.checked = index < count;
        });
        if (splitMode === "custom") {
            splitMode = "auto";
        }
        renderPrizeList();
    });

    autoSplitBtn.addEventListener("click", function () {
        splitMode = "auto";
        autoSplitBtn.blur();
        updatePrizeCalculations();
    });

    equalSplitBtn.addEventListener("click", function () {
        splitMode = "equal";
        equalSplitBtn.blur();
        updatePrizeCalculations();
    });

    customTypeForm.addEventListener("submit", function (event) {
        event.preventDefault();
        const label = customTypeInput.value.trim();
        if (!label) return;

        const id = `custom-${Date.now()}-${prizeTypes.length}`;
        prizeTypes.push({
            id,
            name: label,
            weight: 12,
            pct: 10,
            checked: true,
            isMain: false,
        });
        customTypeInput.value = "";
        renderPrizeList();
        if (document.activeElement === addCustomTypeBtn) {
            addCustomTypeBtn.blur();
        }
    });

    renderPrizeList();

    function renderTicketEntries() {
        ticketEntriesContainer.innerHTML = "";
        for (const num of checkedTicketNumbers) {
            const badge = document.createElement("span");
            badge.classList.add("ticket-entry", "valid");
            badge.textContent = num;
            badge.title = `Number ${num} called`;
            ticketEntriesContainer.appendChild(badge);
        }
    }

    function setTicketStatus(message, type) {
        ticketStatus.textContent = message;
        ticketStatus.className = "ticket-status";
        ticketInput.classList.remove("is-valid", "is-invalid");
        if (type === "valid") {
            ticketStatus.classList.add("valid");
            ticketInput.classList.add("is-valid");
        } else if (type === "invalid") {
            ticketStatus.classList.add("invalid");
            ticketInput.classList.add("is-invalid");
        }
    }

    ticketForm.addEventListener("submit", function (event) {
        event.preventDefault();
        const tokens = ticketInput.value.trim().split(/[\s,]+/).filter(Boolean);
        if (tokens.length === 0) {
            setTicketStatus("Enter a number (1-100)", "invalid");
            return;
        }

        const added = [];
        const alreadyEntered = [];
        const notCalled = [];
        const invalidTokens = [];

        for (const token of tokens) {
            if (!/^\d+$/.test(token)) {
                invalidTokens.push(token);
                continue;
            }
            const num = Number(token);
            if (num < 1 || num > 100) {
                invalidTokens.push(token);
                continue;
            }

            if (generatedNumbers.has(num)) {
                if (checkedTicketNumbers.has(num)) {
                    alreadyEntered.push(num);
                } else {
                    checkedTicketNumbers.add(num);
                    added.push(num);
                }
            } else {
                notCalled.push(num);
            }
        }

        renderTicketEntries();
        ticketInput.value = "";

        if (invalidTokens.length > 0) {
            setTicketStatus(`Invalid number: ${invalidTokens.join(", ")} (use 1-100)`, "invalid");
        } else if (notCalled.length > 0 && added.length > 0) {
            setTicketStatus(`Entered: ${added.join(", ")} | Not called: ${notCalled.join(", ")}`, "invalid");
        } else if (notCalled.length > 0) {
            setTicketStatus(`Not called: ${notCalled.join(", ")}`, "invalid");
        } else if (added.length > 0) {
            setTicketStatus(`Entered: ${added.join(", ")}`, "valid");
        } else if (alreadyEntered.length > 0) {
            setTicketStatus(`Already entered: ${alreadyEntered.join(", ")}`, "valid");
        }

        if (document.activeElement === checkTicketBtn) {
            checkTicketBtn.blur();
        }
    });

    clearTicketBtn.addEventListener("click", function () {
        checkedTicketNumbers.clear();
        renderTicketEntries();
        ticketInput.value = "";
        setTicketStatus("", "");
        clearTicketBtn.blur();
    });

    resetGameBtn.addEventListener("click", function () {
        stopAutoDraw();
        generatedNumbers.clear();
        numberHistory = [];
        checkedTicketNumbers.clear();
        for (const box of grid.querySelectorAll(".number-box.highlight")) {
            box.classList.remove("highlight");
        }
        display.textContent = "Press SPACEBAR";
        previousSubtitle.textContent = "Latest first";
        renderPreviousNumbers();
        renderTicketEntries();
        ticketInput.value = "";
        setTicketStatus("", "");
        resetGameBtn.blur();
    });

    function drawNextNumber() {
        if (generatedNumbers.size >= 100) {
            previousSubtitle.textContent = "All 100 numbers called";
            return false;
        }

        let randomNumber;
        do {
            randomNumber = Math.floor(Math.random() * 100) + 1;
        } while (generatedNumbers.has(randomNumber));

        generatedNumbers.add(randomNumber);
        numberHistory.push(randomNumber);
        display.textContent = `🎲 ${randomNumber} 🎲`;

        // Change color of the selected number in the grid
        document.getElementById(`num-${randomNumber}`).classList.add("highlight");

        // Update previous 5 numbers list
        renderPreviousNumbers();
        return true;
    }

    function stopAutoDraw() {
        if (autoIntervalId !== null) {
            clearInterval(autoIntervalId);
            autoIntervalId = null;
        }
        autoRemainingSeconds = 0;
        autoStartBtn.disabled = false;
        autoStartBtn.textContent = "Start";
        autoStopBtn.disabled = true;
    }

    function startAutoTimerLoop() {
        if (autoIntervalId !== null) {
            clearInterval(autoIntervalId);
        }
        autoRemainingSeconds = autoDelaySeconds;
        autoStartBtn.disabled = true;
        autoStartBtn.textContent = `Next: ${autoRemainingSeconds}s`;
        autoStopBtn.disabled = false;

        autoIntervalId = setInterval(function () {
            autoRemainingSeconds -= 1;
            if (autoRemainingSeconds <= 0) {
                const drew = drawNextNumber();
                if (!drew || generatedNumbers.size >= 100) {
                    stopAutoDraw();
                    return;
                }
                autoRemainingSeconds = autoDelaySeconds;
            }
            autoStartBtn.textContent = `Next: ${autoRemainingSeconds}s`;
        }, 1000);
    }

    function startAutoDraw() {
        if (generatedNumbers.size >= 100) {
            previousSubtitle.textContent = "All 100 numbers called";
            stopAutoDraw();
            return;
        }
        startAutoTimerLoop();
    }

    for (const btn of delayButtons) {
        btn.addEventListener("click", function () {
            const delay = Number(btn.dataset.delay);
            if (!Number.isFinite(delay) || delay < 1) return;
            autoDelaySeconds = delay;
            customDelayInput.value = "";
            customDelayInput.classList.remove("active");
            for (const other of delayButtons) {
                other.classList.toggle("active", other === btn);
            }
            btn.blur();
            if (autoIntervalId !== null) {
                startAutoTimerLoop();
            }
        });
    }

    customDelayInput.addEventListener("input", function () {
        if (customDelayInput.value.trim() === "") {
            customDelayInput.classList.remove("active");
            const presetBtn = document.querySelector(".delay-btn.active") || delayButtons[0];
            if (presetBtn) {
                presetBtn.classList.add("active");
                autoDelaySeconds = Number(presetBtn.dataset.delay) || 3;
            }
            if (autoIntervalId !== null) {
                startAutoTimerLoop();
            }
            return;
        }
        const parsed = Math.floor(Number(customDelayInput.value));
        if (!Number.isFinite(parsed)) return;
        const clamped = Math.max(1, Math.min(60, parsed));
        autoDelaySeconds = clamped;
        for (const btn of delayButtons) {
            btn.classList.remove("active");
        }
        customDelayInput.classList.add("active");
        if (autoIntervalId !== null) {
            startAutoTimerLoop();
        }
    });

    autoStartBtn.addEventListener("click", function () {
        startAutoDraw();
        autoStartBtn.blur();
    });

    autoStopBtn.addEventListener("click", function () {
        stopAutoDraw();
        autoStopBtn.blur();
    });

    // Create number grid (1 to 100)
    for (let i = 1; i <= 100; i++) {
        let div = document.createElement("div");
        div.classList.add("number-box");
        div.textContent = i;
        div.id = `num-${i}`;
        grid.appendChild(div);
    }

    function renderPreviousNumbers() {
        const previousFive = numberHistory.slice(0, -1).slice(-MAX_PREVIOUS).reverse();
        previousNumbersContainer.innerHTML = "";

        for (let i = 0; i < MAX_PREVIOUS; i++) {
            const box = document.createElement("div");
            box.classList.add("prev-box");

            if (i < previousFive.length) {
                box.textContent = previousFive[i];
                if (i === 0) {
                    box.classList.add("latest");
                    box.title = "Most recent previous number";
                }
            } else {
                box.textContent = "-";
                box.classList.add("empty");
            }

            previousNumbersContainer.appendChild(box);
        }
    }

    renderPreviousNumbers();

    // Handle Escape to close drawers & SPACEBAR to generate random number
    document.addEventListener("keydown", function (event) {
        if (event.code === "Escape") {
            let closed = false;
            if (!previousPanel.hidden) {
                setPanelOpen(false);
                closed = true;
            }
            if (!createGamePanel.hidden) {
                setCreatePanelOpen(false);
                closed = true;
            }
            if (closed) {
                return;
            }
        }

        if (event.code === "Space") {
            if (event.target instanceof Element && event.target.matches("input, textarea, select")) {
                return;
            }
            event.preventDefault();
            if (event.repeat) {
                return;
            }

            const drew = drawNextNumber();
            if (!drew || generatedNumbers.size >= 100) {
                if (autoIntervalId !== null) {
                    stopAutoDraw();
                }
                return;
            }

            if (autoIntervalId !== null) {
                startAutoTimerLoop();
            }
        }
    });
});
