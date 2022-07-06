const gameOptions = {
    maxTries: 6,
    answerLength: 5,
};

let gameState = {
    answer: null,
    definition: null,
    guesses: null,
    currentGuess: null,
    status: 'NOT_STARTED',
};

async function fetchDefinition(word) {
    try {
        const response = await fetch("https://api.dictionaryapi.dev/api/v2/entries/en/" + word);
        const data = await response.json();
        return data[0];
    } catch (error) {
        return null;
    }
}

async function startGame() {
    const answer = dictionary[Math.floor(Math.random() * (dictionary.length - 1))];
    const definition = await fetchDefinition(answer);

    gameState = {
        ...gameState,
        answer: answer.toUpperCase().split(''),
        definition,
        guesses: [],
        currentGuess: [],
        status: 'STARTED',
    };
};

function endGame() {
    gameState.status = 'GAME_OVER';

    const definitionContainer = document.querySelector('.definition-container');

    if (gameState.definition) {
        const {
            definition: {
                word,
                phonetic,
                meanings,
            },
        } = gameState;

        definitionContainer.innerHTML = `
            <span>${word.toUpperCase() + " " + (phonetic || "")}</span>
            <span>${meanings[0].partOfSpeech}</span>
            <span class="space">${meanings[0].definitions[0].definition}</span>
        `;
    } else {
        definitionContainer.innerHTML = `
            <span>Answer: ${gameState.answer.join('')}</span>
        `;
    }
}

function handleKeyUp(event) {
    const {
        status,
        currentGuess,
        guesses,
        answer,
    } = gameState;

    if (status !== 'STARTED') {
        return;
    }

    const { key } = event;

    const actions = {
        push: () => currentGuess.push(key.toUpperCase()),
        pop: () => currentGuess.pop(),
        submit: () => {
            guesses.push(currentGuess);
            gameState.currentGuess = [];

            colorizeGridRow(guesses.length - 1);

            const didUseMaxTries = guesses.length === gameOptions.maxTries;
            const didGetCorrectWord = answer.join('') === guesses[guesses.length - 1].join('');

            if (didUseMaxTries || didGetCorrectWord) {
                endGame();
            }
        },
    };

    const action = (
        ((key >= 'a' && key <= 'z') && (currentGuess.length < answer.length))
            ? 'push'
            : (key === 'Backspace')
                ? 'pop'
                : ((key === "Enter") && (currentGuess.length === answer.length))
                    ? 'submit'
                    : null
    );

    if (action !== null) {
        actions[action]();
        setGridRowText(guesses.length);
    }
}

function validateLetter(letter, position) {
    if (gameState.answer[position] === letter) {
        return 'correct';
    } else if (gameState.answer.includes(letter)) {
        return 'kinda-correct';
    } else {
        return 'incorrect';
    }
}

function getGridRowElements(rowNumber) {
    const rangeStart = (rowNumber * gameOptions.answerLength);
    const rangeEnd = rangeStart + gameOptions.answerLength - 1;

    return Array //Array of .grid-item elements
        .from(document.querySelectorAll('.grid-item'))
        .filter((element, index) => index >= rangeStart && index <= rangeEnd);
}

function setGridRowText(rowNumber) {
    getGridRowElements(rowNumber)
        .forEach((element, index) => {
            element.innerHTML = `<span>${gameState.currentGuess[index] || ''}</span>`;
        });
}

function colorizeGridRow(rowNumber) {
    const rowElements = getGridRowElements(rowNumber);
    const row = gameState.guesses[rowNumber];


    const answerMap = {};

    gameState.answer.forEach((letter) => {
        answerMap[letter] = gameState.answer.filter((l) => l === letter).length;
    });


    const colorizedMap = {};

    row.forEach((guessedLetter) => {
        const correctLetterGuesses = row
            .filter((rowLetter, rowLetterIndex) => rowLetter === guessedLetter && validateLetter(guessedLetter, rowLetterIndex) === 'correct')
            .length;

        colorizedMap[guessedLetter] = correctLetterGuesses;
    });

    row.forEach((guessedLetter, index) => {
        const letterElement = rowElements[index];
        const result = validateLetter(guessedLetter, index);

        colorizedMap[guessedLetter]++;

        if (result === 'correct') letterElement.classList.add('correct');
        else if (colorizedMap[guessedLetter] > answerMap[guessedLetter]) letterElement.classList.add('incorrect');
        else letterElement.classList.add(result);
    });

}

(function () {
    startGame()
        .then(() => {
            document.addEventListener('keyup', handleKeyUp);
            document.querySelector('.loading-overlay').classList.add('hidden')
        })
        .catch((error) => {
            console.error(error);
        })
})();
