var Snake = {};

// Конфигурация
Snake.Config = function () {
    // Размер клетки (в пикселях)
    this.pixelSize = 20;
    // Размер поля (в клетках)
    this.boxSize = 10;
    // Изначальная длина змейки (в клетках)
    this.snakeLength = 3;
    // Повышение сложности через N тиков
    this.levelIntervalTicks = 30;
    // Время замены еды (в тиках), если змейка ее не съедает
    this.treatRepositionTicks = 30;
    // Игра ускоряется на N мс с каждым уровнем
    this.levelIncrease= 200;
    // Максимальная скорость игры в мс
    this.minimumLoopInterval = 300;
};

// Начальное состояние игры
Snake.State = function () {
    this.level = 1;
    this.score = 0;
    this.gameOver = false;
    this.paused = false;
    this.loopInterval = 500;
    this.direction = Snake.Direction.Up;
    this.ticks = 0;
    this.lastKeyTick = 0;
    this.lastTreatTick = 0;
};

// Коды клавиш управления
Snake.Direction = {
    Up: 38,
    Down: 40,
    Left: 37,
    Right: 39,
};

Snake.KeyCode = {
    Pause: 32,
    Resume: 82,
};

Snake.Point = function (x, y) {
    this.x = x;
    this.y = y;
};

Snake.Point.prototype.collides = function (arr) {
    var i;
    for (i = 0; i < arr.length; i = i + 1) {
        if (this.x === arr[i].x && this.y === arr[i].y) {return true}
    }
    return false;
};

Snake.Game = function (doc, wnd) {
    this.config = new Snake.Config();
    this.state = new Snake.State();
    doc.onkeydown = this.onkeydown.bind(this);
    this.doc = doc;
    this.wnd = wnd;
    this.gridDrawn = false;
    this.boxDrawn = false;
    this.loop();
};

Snake.Game.prototype.initBox = function () {
    if (this.box) {return}
    var x = 0, y = 0;
    this.box = [];
    x = 0;
    for (y = 0; y < this.config.boxSize; y = y + 1) {
        this.box.push(new Snake.Point(x, y));
    }
    y = this.config.boxSize - 1;
    for (x = 0; x < this.config.boxSize; x = x + 1) {
        this.box.push(new Snake.Point(x, y));
    }
    x = this.config.boxSize - 1;
    for (y = this.config.boxSize - 2; y >= 0; y = y - 1) {
        this.box.push(new Snake.Point(x, y));
    }
    y = 0;
    for (x = this.config.boxSize - 2; x > 0; x = x - 1) {
        this.box.push(new Snake.Point(x, y));
    }
};

//Спавн змейки
Snake.Game.prototype.initSnake = function () {
    if (this.snake) {return}
    var i = 0,
        x = Math.floor(this.config.boxSize / 2);
    this.snake = [];
    for (i = this.config.snakeLength; i > 0; i = i - 1) {
        this.snake.push(new Snake.Point(x, i));
    }
};

Snake.Game.prototype.calculateShift = function () {
    var shift = new Snake.Point(0, 0);
    switch (this.state.direction) {
    case Snake.Direction.Up:
        shift.y = 1;
        break;
    case Snake.Direction.Down:
        shift.y = -1;
        break;
    case Snake.Direction.Left:
        shift.x = -1;
        break;
    case Snake.Direction.Right:
        shift.x = 1;
        break;
    }
    return shift;
};

Snake.Game.prototype.moveSnake = function () {
    // Рассчет новой позиции головы
    var head = new Snake.Point(this.snake[0].x, this.snake[0].y),
        shift = this.calculateShift();
    head.x = head.x + shift.x;
    head.y = head.y + shift.y;

    // Проверка касания головы и еды
    if (head.collides([this.treat])) {
        // Добавление очков в зависимости от уровня
        this.state.score = this.state.score + this.state.level;
        delete this.treat;
    } else {
        // Удалить клетку хвоста
        this.snake.pop();
    }
    // Проверка столкнулась ли змея с границей поля
    if (head.collides(this.box)) {
        this.endGame();
        return;
    }
    // Проверка столкнулась ли змея с хвостом
    if (head.collides(this.snake)) {
        this.endGame();
        return;
    }
    this.snake.unshift(head);

};

Snake.Game.prototype.getRandomInt = function (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

Snake.Game.prototype.placeTreat = function () {
    if (this.state.ticks - this.state.lastTreatTick >= this.config.treatRepositionTicks) {
        delete this.treat;
    }

    if (this.treat) {return}
    var x = 0, y = 0, treat = null;
    while (!this.treat) {
        x = this.getRandomInt(1, this.config.boxSize - 1);
        y = this.getRandomInt(1, this.config.boxSize - 1);
        treat = new Snake.Point(x, y);
        if (!treat.collides(this.snake) && !treat.collides(this.box)) {
            this.treat = treat;
            this.state.lastTreatTick =  this.state.ticks;
        }
    }
};

Snake.Game.prototype.update = function () {
    this.initBox();
    this.initSnake();
    if (this.state.paused) {return}
    if (this.state.gameOver) {return}
    this.placeTreat();
    this.moveSnake();
    this.state.ticks = this.state.ticks + 1;
    this.increaseLevel();
};

Snake.Game.prototype.cellID = function (x, y) {
    return 'cell_' + x + '_' + y;
};

Snake.Game.prototype.drawGrid = function () {
    if (this.gridDrawn) {return}
    var i = 0,
        j = 0,
        topMargin = this.doc.getElementById('hud').offsetHeight,
        leftMargin = window.innerWidth / 2 - this.config.pixelSize / 2 * this.config.boxSize,
        div = null;
    for (i = 0; i < this.config.boxSize; i = i + 1) {
        for (j = 0; j < this.config.boxSize; j = j + 1) {
            div = this.doc.createElement('div');
            div.className = 'cell';
            div.style.width = this.config.pixelSize + 'px';
            div.style.height = this.config.pixelSize + 'px';
            div.style.left = leftMargin + (i * this.config.pixelSize) + 'px';
            div.style.top = topMargin + (j * this.config.pixelSize) + 'px';
            div.id = this.cellID(i, this.config.boxSize - j - 1);
            this.doc.body.appendChild(div);
        }
    }
    this.gridDrawn = true;
};

Snake.Game.prototype.drawBox = function () {
    if (this.boxDrawn) {return}
    var i = 0,
        div = null,
        pt = null;
    for (i = 0; i < this.box.length; i = i + 1) {
        pt = this.box[i];
        div = this.doc.getElementById(this.cellID(pt.x, pt.y));
        div.className = 'cell box';
    }
    this.boxDrawn = true;
};

Snake.Game.prototype.drawSnake = function () {
    var i = 0,
        id = null,
        div = null,
        existing = this.doc.getElementsByClassName('snake'),
        requiredIDs = {};
    for (i = 0; i < this.snake.length; i = i + 1) {
        requiredIDs[this.cellID(this.snake[i].x, this.snake[i].y)] = true;
    }
    for (i = 0; i < existing.length; i = i + 1) {
        if (!requiredIDs[existing[i].id]) {
            div = this.doc.getElementById(existing[i].id);
            div.className = 'cell';
        } else {
            delete requiredIDs[existing[i].id];
        }
    }
    for (id in requiredIDs) {
        if (requiredIDs.hasOwnProperty(id)) {
            div = this.doc.getElementById(id);
            div.className = 'cell snake';
        }
    }
};

Snake.Game.prototype.drawTreat = function () {
    var div = 0,
        requiredID = null,
        existing = this.doc.getElementsByClassName('treat');
    if (!this.treat && existing.length) {
        existing[0].className = 'cell';
        return;
    }
    if (!this.treat) {return}
    requiredID = this.cellID(this.treat.x, this.treat.y);
    if (existing.length && existing[0].id !== requiredID) {
        existing[0].className = 'cell';
    } else {
        div = this.doc.getElementById(requiredID);
        div.className = 'cell treat';
    }
};

Snake.Game.prototype.stateDescription = function () {
    if (this.state.gameOver) {
        return "GAME OVER";
    }
    if (this.state.paused) {
        return "PAUSED (PRESS R TO RESUME)";
    }
    return "PRESS SPACE TO PAUSE";
};

Snake.Game.prototype.drawHUD = function () {
    this.doc.getElementById("level").innerHTML = this.state.level;
    this.doc.getElementById("score").innerHTML = this.state.score;
    this.doc.getElementById("state").innerHTML = this.stateDescription();
};

Snake.Game.prototype.draw = function () {
    this.drawHUD();
    if (this.state.gameOver) {return}
    this.drawGrid();
    this.drawBox();
    this.drawSnake();
    this.drawTreat();
};

Snake.Game.prototype.onkeydown = function (evt) {
    if (this.state.gameOver) {return}
    if (this.state.lastKeyTick === this.state.ticks) {return}
    var code = evt.keyCode;
    if ((Snake.Direction.Up === code && Snake.Direction.Down !== this.state.direction)
            || (Snake.Direction.Down === code && Snake.Direction.Up !== this.state.direction)
            || (Snake.Direction.Left === code && Snake.Direction.Right !== this.state.direction)
            || (Snake.Direction.Right === code && Snake.Direction.Left !== this.state.direction)) {
        this.state.direction = code;
        this.state.lastKeyTick = this.state.ticks} 
    else if (Snake.KeyCode.Pause === code) {this.state.paused = true} 
    else if (Snake.KeyCode.Resume === code) {this.state.paused = false}
    return true;
};

Snake.Game.prototype.increaseLevel = function () {
    if (this.state.ticks % this.config.levelIntervalTicks !== 0) {return}
    this.state.level = this.state.level + 1;
    // Установка нового размера тика, но не меньше чем в конфиге
    this.state.loopInterval = this.state.loopInterval - this.config.levelIncrease;
    if (this.state.loopInterval < this.config.minimumLoopInterval) {
        this.state.loopInterval = this.config.minimumLoopInterval;
    }
};

Snake.Game.prototype.loop = function () {
    this.update();
    this.draw();
    this.wnd.setTimeout(this.loop.bind(this), this.state.loopInterval);
};

Snake.Game.prototype.endGame = function() {
    this.state.gameOver = true;
    restartButton.style.display = "inline";

    if (localStorage.getItem("top") < this.state.score){
        localStorage.setItem('top', this.state.score)
    }
}

Snake.Game.prototype.restart = function() {
    restartButton.style.display = "none";
    location.reload();
}

restartButton = document.getElementById("restart");
document.getElementById("top").innerHTML = localStorage.getItem("top");
document.game = new Snake.Game(document, window);
restartButton.onclick = function(){document.game.restart();}