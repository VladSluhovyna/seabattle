if (!Function.prototype.bind) {
    // Перевірка, чи метод bind вже існує

    Function.prototype.bind = function(oThis) {
        // Перевірка, чи контекст для bind визначений
        if (typeof this !== 'function') {
            // Викидає TypeError, якщо те, що намагається зв'язати, не є функцією
            throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
        }

        // Збереження аргументів, з якими буде викликана функція
        var aArgs   = Array.prototype.slice.call(arguments, 1),
            fToBind = this,  // Функція, яку будемо зв'язувати
            fNOP    = function() {},  // Пуста функція-заглушка
            fBound  = function() {
                // Виклик функції fToBind з відповідним контекстом та аргументами
                return fToBind.apply(this instanceof fNOP && oThis
                    ? this
                    : oThis,
                    aArgs.concat(Array.prototype.slice.call(arguments)));
            };

        // Налаштування прототипів
        fNOP.prototype = this.prototype;
        fBound.prototype = new fNOP();

        // Повертаємо нову функцію, готову до використання
        return fBound;
    };
}

(function (root, factory) {
    // Перевірка наявності define та його властивості amd
    if (typeof define === 'function' && define.amd) {
        // Якщо define і amd існують (AMD-середовище)
        // Визначення модуля та його залежностей
        define(['sea-battle'], factory);
    } else {
       // Якщо define або amd відсутні (не-AMD-середовище)
        // Присвоєння модулю глобальної змінної у вікні (глобальний об'єкт)
        root.SeeBattle = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
// Визначення модуля
    // Повертається об'єкт або клас SeeBattle
    // factory - це функція, яка повертає конструктор або об'єкт
    // Залежно від специфікацій вашого модуля
    /**
     * конструктор для створення поля
     * 
     * @constructor
     * @param {string} gameAreaId
     * @return {SeeBattle}
     */
    function SeeBattle(gameAreaId){
        this.gameFieldBorderX = ['A','B','C','D','E','F','G','H','I','J'];
        this.gameFieldBorderY = ['1','2','3','4','5','6','7','8','9','10'];
        this.gameArea = document.getElementById(gameAreaId);
        this.gameArea.innerHTML = "";
        this.shipsConfiguration = [
            {maxShips: 1, pointCount: 4},
            {maxShips: 2, pointCount: 3},
            {maxShips: 3, pointCount: 2},
            {maxShips: 4, pointCount: 1}
        ];
        this.userName = null;
        this.pcName = null;
        this.pcDelay = 800;

        this._hitsForWin = 0;
        for(var i=0;i<this.shipsConfiguration.length;i++){
            this._hitsForWin = +this._hitsForWin + (this.shipsConfiguration[i].maxShips*this.shipsConfiguration[i].pointCount);
        }

        this._pcShipsMap = null;
        this._userShipsMap = null;
        this._gameStopped = false;

        this.CELL_WITH_SHIP = 1;
        this.CELL_EMPTY = 0;

        /**
         * Html елементи
         */
        this.pcInfo = null;
        this.userInfo = null;
        this.toolbar = null;
        this.startGameButton = null;
        this.pcGameField = null;
        this.userGameField = null;
    }

    SeeBattle.prototype = {
        /**
         * встановлення розмітки потрібної для гри
         */
        run: function(){
            this.createToolbar();
            this.createGameFields();
            this.createFooter();
        },
        createToolbar: function(){ //тулбар з рахунком і інфою 
            this.toolbar = document.createElement('div');
            this.toolbar.setAttribute('class', 'toolbar');
            this.gameArea.appendChild(this.toolbar);
        },
        createGameFields: function(){//поля для гри
            var pcGameArea = document.createElement('div');
            pcGameArea.setAttribute('class', 'pcGameArea');
            this.gameArea.appendChild(pcGameArea);

            var userGameArea = document.createElement('div');
            userGameArea.setAttribute('class', 'userGameArea');
            this.gameArea.appendChild(userGameArea);

            this.pcInfo = document.createElement('div');
            pcGameArea.appendChild(this.pcInfo);

            this.userInfo = document.createElement('div');
            userGameArea.appendChild(this.userInfo);

            this.pcGameField = document.createElement('div');
            this.pcGameField.setAttribute('class', 'gameField');
            this.userGameField = document.createElement('div');
            this.userGameField.setAttribute('class', 'gameField');
            pcGameArea.appendChild(this.pcGameField);
            userGameArea.appendChild(this.userGameField);
        },
        createFooter: function(){//створення нижніьої частини
            var footer = document.createElement('div');
            footer.setAttribute('class', 'footer');

            this.startGameButton = document.createElement('button');
            this.startGameButton.innerHTML = 'Почати гру';
            this.startGameButton.setAttribute('class', 'btn');
            this.startGameButton.onclick = function(){
                this.startNewGame();
            }.bind(this);
            footer.appendChild(this.startGameButton);

            this.gameArea.appendChild(footer);
        },
        startNewGame: function(){
            this.userName = this.userName || prompt('Як вас звати?', '');
            this.pcName = this.pcName || prompt('Нік супротивника', '');

            if(!this.userName || !this.pcName){
                alert('Вставте нік наново');
                return;
            }

            this.startGameButton.innerHTML = 'Почати спочатку...';
            this.pcInfo.innerHTML = this.pcName + ' (Ваш суперник)';
            this.userInfo.innerHTML = this.userName + ' (ваше поле)';

            this._pcShipsMap = this.generateRandomShipMap();
            this._userShipsMap = this.generateRandomShipMap();
            this._pcShotMap = this.generateShotMap();
            this._userHits = 0;
            this._pcHits = 0;
            this._blockHeight = null;
            this._gameStopped = false;
            this._pcGoing = false;

            this.drawGamePoints();
            this.updateToolbar();
        },

        /**
         * Створення\оновленення ячейек для гри
         */
        drawGamePoints: function(){
            for(var yPoint=0;yPoint<this.gameFieldBorderY.length; yPoint++){
                for(var xPoint=0;xPoint<this.gameFieldBorderX.length; xPoint++){
                    var pcPointBlock = this.getOrCreatePointBlock(yPoint, xPoint);
                    pcPointBlock.onclick = function(e){
                        this.userFire(e);
                    }.bind(this);
                    // скрипт який не показує місце знаходження суперника
                    /*if(this._pcShipsMap[yPoint][xPoint] === this.CELL_WITH_SHIP){
                        pcPointBlock.setAttribute('class', 'ship');
                    }*/

                    var userPointBlock = this.getOrCreatePointBlock(yPoint, xPoint, 'user');
                    if(this._userShipsMap[yPoint][xPoint] === this.CELL_WITH_SHIP){
                        userPointBlock.setAttribute('class', 'ship');
                    }
                }
            }
        },

        /**
         * Высота ячейки полученная из значения ширины
         * @type {type}
         */
        _blockHeight: null, 
        /*
        це внутрішня змінна класу SeeBattle, яка використовується для зберігання висоти 
        (і відповідно розміру) HTML-елементів, які представляють ігрові точки на полі. 
        Висота блоку визначається шириною блоку, таким чином, що вони утворюють квадрати 
        (рівносторонні прямокутники).
        */ 

        /**
         * Редагування (скидання або навпаки значень)
         * @return {type}
         */
        getOrCreatePointBlock: function(yPoint, xPoint, type){
            var id = this.getPointBlockIdByCoords(yPoint, xPoint, type);
            var block = document.getElementById(id);
            if(block){
                block.innerHTML = '';
                block.setAttribute('class', '');
            }else{
                block = document.createElement('div');
                block.setAttribute('id', id);
                block.setAttribute('data-x', xPoint);
                block.setAttribute('data-y', yPoint);
                if(type && type === 'user'){
                    this.userGameField.appendChild(block);
                }else{
                    this.pcGameField.appendChild(block);
                }
            }
            block.style.width = (100 / this.gameFieldBorderY.length) + '%';
            if(!this._blockHeight){
                this._blockHeight = block.clientWidth;
            }
            block.style.height = this._blockHeight + 'px';
            block.style.lineHeight = this._blockHeight + 'px';
            block.style.fontSize = this._blockHeight + 'px';
            return block;
        },

        /**
         
         * Повернення id і генерування на його основі координати і типу поля 
         * @param {type} yPoint
         * @param {type} xPoint
         * @param {type} type
         * @return {String}
         */
        getPointBlockIdByCoords: function(yPoint, xPoint, type){
            if(type && type === 'user'){
                return 'user_x' + xPoint + '_y' + yPoint;
            }
            return 'pc_x' + xPoint + '_y' + yPoint;
        },

        /**
         * Створення масиву для вибору порядку для стрільби
         * @return {Array|SeeBattle.prototype.generateShotMap.map}
         */
        generateShotMap: function(){
            var map = [];
            for(var yPoint=0;yPoint<this.gameFieldBorderY.length; yPoint++){
                for(var xPoint=0;xPoint<this.gameFieldBorderX.length; xPoint++){
                    map.push({y: yPoint, x: xPoint});
                }
            }
            return map;
        },

        /**
         * Генератор інформації чи є чи немає коріблів на полі
         * @return {Array}
         */
        generateRandomShipMap: function(){
            var map = [];
            
            //генерація карти знаходження, звертаючи уваги на негативні координати, щоб створювати поля (границі)
            for(var yPoint=-1;yPoint<(this.gameFieldBorderY.length+1); yPoint++){
                for(var xPoint=-1;xPoint<(this.gameFieldBorderX.length+1); xPoint++){
                    if(!map[yPoint]){
                        map[yPoint] = [];
                    }
                    map[yPoint][xPoint] = this.CELL_EMPTY;
                }
            }

           // Зробити глибоку копію конфігурації кораблів для подальших маніпуляцій.
var shipsConfiguration = JSON.parse(JSON.stringify(this.shipsConfiguration));

// Прапорець, що вказує, чи всі кораблі розміщені.
var allShipsPlaced = false;

// Поки не всі кораблі розміщені.
while(allShipsPlaced === false){
    // Вибрати випадкові координати для розміщення корабля.
    var xPoint = this.getRandomInt(0, this.gameFieldBorderX.length);
    var yPoint = this.getRandomInt(0, this.gameFieldBorderY.length);

    // Перевірити, чи вільна точка для розміщення корабля.
    if(this.isPointFree(map, xPoint, yPoint) === true){
        // Якщо можливо розмістити корабель горизонтально, зробити це.
        if(this.canPutHorizontal(map, xPoint, yPoint, shipsConfiguration[0].pointCount, this.gameFieldBorderX.length)){
            for(var i=0;i<shipsConfiguration[0].pointCount;i++){
                map[yPoint][xPoint + i] = this.CELL_WITH_SHIP;
            }
        } else if(this.canPutVertical(map, xPoint, yPoint, shipsConfiguration[0].pointCount, this.gameFieldBorderY.length)){
            // Інакше, якщо можливо розмістити корабель вертикально, зробити це.
            for(var i=0;i<shipsConfiguration[0].pointCount;i++){
                map[yPoint + i][xPoint] = this.CELL_WITH_SHIP;
            }
        } else {
            // Якщо неможливо розмістити корабель ні горизонтально, ні вертикально, повторити цикл.
            continue;
        }

        // Оновити налаштування кораблів після розміщення.
        shipsConfiguration[0].maxShips--;
        
        // Видалити конфігурацію корабля, якщо їх не залишилося.
        if(shipsConfiguration[0].maxShips < 1){
            shipsConfiguration.splice(0, 1);
        }

        // Якщо всі кораблі розміщені, встановити прапорець в true.
        if(shipsConfiguration.length === 0){
            allShipsPlaced = true;
        }
    }
}

            return map;
        },
        getRandomInt: function(min, max) {
            return Math.floor(Math.random() * (max - min)) + min;
        },

        /**
         * Чи можна розмістити однопалубний корабель
         * @param {type} map
         * @param {type} xPoint
         * @param {type} yPoint
         * @return {Boolean}
         */
        isPointFree: function(map, xPoint, yPoint){
            // Перевірити, чи всі навколишні клітинки порожні (CELL_EMPTY)
            if(map[yPoint][xPoint] === this.CELL_EMPTY
                && map[yPoint-1][xPoint] === this.CELL_EMPTY
                && map[yPoint-1][xPoint+1] === this.CELL_EMPTY
                && map[yPoint][xPoint+1] === this.CELL_EMPTY
                && map[yPoint+1][xPoint+1] === this.CELL_EMPTY
                && map[yPoint+1][xPoint] === this.CELL_EMPTY
                && map[yPoint+1][xPoint-1] === this.CELL_EMPTY
                && map[yPoint][xPoint-1] === this.CELL_EMPTY
                && map[yPoint-1][xPoint-1] === this.CELL_EMPTY
            ){
                return true;
            }
            
            // Якщо хоча б одна клітина зайнята, повернути false
            return false;
        },

        /**
 * Перевіряє, чи можливо розмістити корабель горизонтально вздовж ігрового поля
 * @param {array} map - Масив, який представляє ігрове поле
 * @param {number} xPoint - Координата X початкової точки
 * @param {number} yPoint - Координата Y початкової точки
 * @param {number} shipLength - Довжина корабля
 * @param {number} coordLength - Довжина ігрового поля по відповідній координаті
 * @return {boolean} - true, якщо можна розмістити корабель, false - в іншому випадку
 */
canPutHorizontal: function(map, xPoint, yPoint, shipLength, coordLength){
    var freePoints = 0;
    for(var x=xPoint;x<coordLength;x++){
        // Перевірити, чи всі клітинки горизонтального рядка порожні (CELL_EMPTY)
        if(map[yPoint][x] === this.CELL_EMPTY
            && map[yPoint-1][x] === this.CELL_EMPTY
            && map[yPoint-1][x+1] === this.CELL_EMPTY
            && map[yPoint][x+1] === this.CELL_EMPTY
            && map[yPoint+1][x+1] === this.CELL_EMPTY
            && map[yPoint+1][x] === this.CELL_EMPTY
        ){
            freePoints++;
        } else {
            // Якщо знайдена зайнята клітина, припинити перевірку
            break;
        }
    }
    return freePoints >= shipLength;
},


        /**
 * Перевіряє, чи можливо розмістити корабель вертикально вздовж ігрового поля
 * @param {array} map - Масив, який представляє ігрове поле
 * @param {number} xPoint - Координата X початкової точки
 * @param {number} yPoint - Координата Y початкової точки
 * @param {number} shipLength - Довжина корабля
 * @param {number} coordLength - Довжина ігрового поля по відповідній координаті
 * @return {boolean} - true, якщо можна розмістити корабель, false - в іншому випадку
 */
canPutVertical: function(map, xPoint, yPoint, shipLength, coordLength){
    var freePoints = 0;
    for(var y=yPoint; y < coordLength; y++){
        // Перевірити, чи всі клітинки вертикального рядка порожні (CELL_EMPTY)
        if(map[y][xPoint] === this.CELL_EMPTY
            && map[y+1][xPoint] === this.CELL_EMPTY
            && map[y+1][xPoint+1] === this.CELL_EMPTY
            && map[y+1][xPoint] === this.CELL_EMPTY
            && map[y][xPoint-1] === this.CELL_EMPTY
            && map[y-1][xPoint-1] === this.CELL_EMPTY
        ){
            freePoints++;
        } else {
            // Якщо знайдена зайнята клітина, припинити перевірку
            break;
        }
    }
    return freePoints >= shipLength;
},

        /**
         * Обробка кліку по ячейці
         * @param {type} e
         */
        /**
 * Обробляє подію вогню користувача
 * @param {Event} event - Об'єкт події вогню
 */
userFire: function(event){
    // Перевірка, чи гра не зупинена або комп'ютер не вистрілює
    if(this.isGameStopped() || this.isPCGoing()){
        return;
    }

    // Отримання об'єкту події та визначення цілі вогню (елемент, на який натискав користувач)
    var e = event || window.event;
    var firedEl = e.target || e.srcElement;
    var x = firedEl.getAttribute('data-x');
    var y = firedEl.getAttribute('data-y');

    // Перевірка, чи попав користувач по порожній клітині
    if(this._pcShipsMap[y][x] === this.CELL_EMPTY){
        firedEl.innerHTML = this.getFireFailTemplate();
        this.prepareToPcFire();
    } else {
        // Якщо користувач попав по кораблю
        firedEl.innerHTML = this.getFireSuccessTemplate();
        firedEl.setAttribute('class', 'ship');
        this._userHits++;
        this.updateToolbar();

        // Перевірка, чи користувач переміг
        if(this._userHits >= this._hitsForWin){
            this.stopGame();
        }
    }

    // Вимкнення обробника події для запобігання повторного вогню в ту ж саму клітину
    firedEl.onclick = null;
},

/**
 * Прапорець, що вказує, чи комп'ютер виконує свій хід
 */
_pcGoing: false,

/**
 * Перевіряє, чи комп'ютер виконує свій хід
 * @return {boolean} - true, якщо комп'ютер виконує хід, false - в іншому випадку
 */
isPCGoing: function(){
    return this._pcGoing;
},


        /**
         * Створює затримку перед чергою бота 
         * яка творює побачити чий хід
         */
        prepareToPcFire: function(){
            this._pcGoing = true;
            this.updateToolbar();
            setTimeout(function(){
                this.pcFire();
            }.bind(this), this.pcDelay);
        },

        /**
         * ВПостріл бота
         *
         */
       /**
 * Виконує хід комп'ютера
 */
pcFire: function(){
    // Перевірка, чи гра не зупинена
    if(this.isGameStopped()){
        return;
    }

    // Обирається випадковий постріл з раніше згенерованої карти
    var randomShotIndex = this.getRandomInt(0, this._pcShotMap.length);
    var randomShot = JSON.parse(JSON.stringify(this._pcShotMap[randomShotIndex]));

    // Видалення вибраного пострілу з карти
    this._pcShotMap.splice(randomShotIndex, 1);

    // Отримання HTML-елемента за координатами вогню
    var firedEl = document.getElementById(this.getPointBlockIdByCoords(randomShot.y, randomShot.x, 'user'));

    // Перевірка, чи комп'ютер попав по порожній клітині
    if(this._userShipsMap[randomShot.y][randomShot.x] === this.CELL_EMPTY){
        firedEl.innerHTML = this.getFireFailTemplate();
    } else {
        // Якщо комп'ютер попав по кораблю
        firedEl.innerHTML = this.getFireSuccessTemplate();
        this._pcHits++;
        this.updateToolbar();

        // Перевірка, чи комп'ютер переміг
        if(this._pcHits >= this._hitsForWin){
            this.stopGame();
        } else {
            this.prepareToPcFire();
        }
    }

    // Завершення ходу комп'ютера та оновлення панелі інструментів
    this._pcGoing = false;
    this.updateToolbar();
},

        /**
 * Зупинка гри
 */
stopGame: function(){
    // Встановлення прапорця, що гра зупинена
    this._gameStopped = true;
    this._pcGoing = false;

    // Зміна тексту кнопки "Зіграти ще раз?"
    this.startGameButton.innerHTML = 'Зіграти ще раз?';

    // Оновлення інтерфейсу
    this.updateToolbar();
},

/**
 * Перевірка, чи гра зупинена
 * @return {boolean}
 */
isGameStopped: function(){
    return this._gameStopped;
},

/**
 * Шаблон для відображення успішного вогню
 * @return {string}
 */
getFireSuccessTemplate: function(){
    return 'X';
},

/**
 * Шаблон для відображення невдачного вогню
 * @return {string}
 */
getFireFailTemplate: function(){
    return '&#183;'; // В даному випадку використовується символ крапки (пуста клітина)
},


        //**
 // Оновлення інформації на інтерфейсі гри
        
       updateToolbar: function(){
           // Виведення рахунку та інформації про стан гри
           this.toolbar.innerHTML = 'Рахунок - ' + this._pcHits + ':' + this._userHits;
       
           // Перевірка, чи гра завершена
           if(this.isGameStopped()){
               // Додавання повідомлення про перемогу чи поразку
               if(this._userHits >= this._hitsForWin){
                   this.toolbar.innerHTML += ', ви перемогли';
               }else{
                   this.toolbar.innerHTML += ', перемога суперника';
               }
           }else if(this.isPCGoing()){
               // Додавання повідомлення про те, що зараз ходить противник
               this.toolbar.innerHTML += ', хід суперника';
           }else{
               // Додавання повідомлення про те, що зараз ваш хід
               this.toolbar.innerHTML += ', зараз ваш хід';
            }
        },
    };

    return SeeBattle;
}));