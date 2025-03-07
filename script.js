document.addEventListener("DOMContentLoaded", function () {
    const display = document.getElementById("display");
    const grid = document.getElementById("grid");
    let generatedNumbers = new Set();

    // Create number grid (1 to 100)
    for (let i = 1; i <= 100; i++) {
        let div = document.createElement("div");
        div.classList.add("number-box");
        div.textContent = i;
        div.id = `num-${i}`;
        grid.appendChild(div);
    }

    // Generate random number on SPACEBAR press
    document.addEventListener("keydown", function (event) {
        if (event.code === "Space") {
            let randomNumber;
            do {
                randomNumber = Math.floor(Math.random() * 100) + 1;
            } while (generatedNumbers.has(randomNumber));

            generatedNumbers.add(randomNumber);
            display.textContent = `Number: ${randomNumber}`;

            // Change color of the selected number in the grid
            document.getElementById(`num-${randomNumber}`).classList.add("highlight");
        }
    });
});
