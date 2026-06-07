// ==========================================
// 1. ИНИЦИАЛИЗАЦИЯ И ОБЛАЧНАЯ БАЗА SUPABASE
// ==========================================
const supabaseUrl = 'https://dmhdkongscvylxbsbnsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtaGRrb25nc2N2eWx4YnNibnNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3MzA1MzgsImV4cCI6MjA5NjMwNjUzOH0.zsowSol26OEDgLsSt_NDxySe3aLTk44EGDlhUwsM2Fo';

const supabaseClient = window.supabase ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;

const defaultRecipes = [
    {
        id: 1,
        title: "Классический драник",
        category: "main-dishes",
        time: "25 мин",
        difficulty: "Легко",
        ingredients: [
            { name: "картофель", amount: "5 шт (крупных)" },
            { name: "яяйцо", amount: "1 шт" },
            { name: "мука", amount: "2 ст. л." },
            { name: "лук", amount: "1 шт" },
            { name: "масло", amount: "30 мл" }
        ],
        steps: [
            "Очистите картофель и лук, натрите их на мелкой терке.",
            "Отожмите лишний сок из получившейся массы.",
            "Добавьте яйцо, пару ложек муки, соль по вкусу и перемешайте.",
            "Разогрейте масло на сковороде и выкладывайте массу ложкой в виде оладий.",
            "Обжаривайте с двух сторон до золотистой корочки."
        ]
    },
    {
        id: 2,
        title: "Куриный суп с картофелем",
        category: "soups",
        time: "45 мин",
        difficulty: "Легко",
        ingredients: [
            { name: "курица", amount: "400 г" },
            { name: "картофель", amount: "3 шт" },
            { name: "лук", amount: "1 шт" },
            { name: "морковь", amount: "1 шт" },
            { name: "вода", amount: "2 л" },
            { name: "соль", amount: "по вкусу" }
        ],
        steps: [
            "Отварите куриное филе в подсоленной воде до готовности, снимите пену.",
            "Нарежьте картофель кубиками и добавьте в кипящий бульон.",
            "Сделайте зажарку: мелко нарезанный лук и тертую морковь обжарьте на масле.",
            "Переложите зажарку в суп за 5 минут до готовности картофеля.",
            "Подавайте горячим."
        ]
    },
    {
        id: 3,
        title: "Сытный омлет",
        category: "breakfast",
        time: "15 мин",
        difficulty: "Легко",
        ingredients: [
            { name: "яйцо", amount: "3 шт" },
            { name: "молоко", amount: "50 мл" },
            { name: "сыр", amount: "50 г" },
            { name: "масло", amount: "10 г" },
            { name: "соль", amount: "1 щепотка" }
        ],
        steps: [
            "Взбейте яйца с молоком и щепоткой соли до однородности.",
            "Разогрейте скопороду с кусочком сливочного масла.",
            "Вылейте яичную смесь и готовьте на среднем огне под крышкой.",
            "За минуту до готовности посыпьте тертым сыром."
        ]
    }
];

let recipeDatabase = [...defaultRecipes];
let basicIngredients = JSON.parse(localStorage.getItem('userPantry')) || ["соль", "перец", "вода", "масло"];

const synonymDictionary = {
    "картоха": "картофель",
    "картошка": "картофель",
    "картошель": "картофель",
    "куриное филе": "курица",
    "курочка": "курица",
    "кура": "курица",
    "томаты": "помидор",
    "огурцы": "огурец"
};

let userIngredientsList = [];
let inputEl, addBtnEl, tagsContainerEl, searchBtnEl, resultsContainerEl;

async function loadRecipesFromCloud() {
    if (!supabaseClient) {
        console.warn("Предупреждение: Supabase JS SDK не загружен на этой странице!");
        return;
    }
    try {
        const { data, error } = await supabaseClient
            .from('customRecipes')
            .select('*');

        if (error) throw error;
        recipeDatabase = [...defaultRecipes, ...(data || [])];
    } catch (err) {
        console.error('Ошибка загрузки рецептов из Supabase:', err.message);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    inputEl = document.getElementById('ingredient-input');
    addBtnEl = document.getElementById('add-btn');
    tagsContainerEl = document.getElementById('tags-container');
    searchBtnEl = document.getElementById('search-recipes-btn');
    resultsContainerEl = document.getElementById('results-container');

    if (addBtnEl && inputEl) {
        addBtnEl.addEventListener('click', addIngredientTag);
        inputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addIngredientTag();
        });
    }
    if (searchBtnEl) {
        searchBtnEl.addEventListener('click', runSmartSearch);
    }

    await loadRecipesFromCloud();

    if (document.getElementById('catalog-container')) renderCatalog('all');
    if (document.getElementById('auth-form')) {
        if (localStorage.getItem('currentUser')) window.location.href = 'profile.html';
    }
    if (document.getElementById('profile-block')) checkUserSession();
    if (document.getElementById('my-recipes-container')) renderMyRecipes();
    if (document.getElementById('favorites-container')) renderFavoritesPage();
    if (document.getElementById('recipe-full-details')) renderSingleRecipePage();
    if (document.getElementById('blog-container')) renderBlog('all');
});

function getDifficultyFire(difficulty) {
    const diff = String(difficulty).trim().toLowerCase();
    if (diff === 'сложно') return '🔥🔥🔥';
    if (diff === 'средне') return '🔥🔥';
    return '🔥';
}

function addIngredientTag() {
    if (!inputEl) return;
    let value = inputEl.value.trim().toLowerCase();
    if (!value) return;
    if (synonymDictionary[value]) value = synonymDictionary[value];
    if (!userIngredientsList.includes(value)) {
        userIngredientsList.push(value);
        renderTags();
    }
    inputEl.value = '';
}

function renderTags() {
    if (!tagsContainerEl) return;
    tagsContainerEl.innerHTML = '';
    userIngredientsList.forEach((ing, index) => {
        const tag = document.createElement('div');
        tag.className = 'tag';
        tag.innerHTML = `${ing} <span data-index="${index}">&times;</span>`;
        tagsContainerEl.appendChild(tag);
    });
}

document.addEventListener('click', (e) => {
    if (e.target.parentElement && e.target.parentElement.classList.contains('tag') && e.target.tagName === 'SPAN') {
        const index = e.target.getAttribute('data-index');
        userIngredientsList.splice(index, 1);
        renderTags();
    }
});

function runSmartSearch() {
    if (!resultsContainerEl) return;
    if (userIngredientsList.length === 0) {
        resultsContainerEl.innerHTML = `<div class="empty-state"><p style="color: var(--danger);">Пожалуйста, добавьте ингредиент!</p></div>`;
        return;
    }

    let matchesFound = [];

    recipeDatabase.forEach(recipe => {
        const rawIngredientsNames = recipe.ingredients.map(i => i.name);
        const criticalIngredients = rawIngredientsNames.filter(item => !basicIngredients.includes(item));
        const matched = criticalIngredients.filter(item => userIngredientsList.includes(item));
        const missing = criticalIngredients.filter(item => !userIngredientsList.includes(item));

        if (matched.length > 0) {
            const score = Math.round((matched.length / criticalIngredients.length) * 100);
            matchesFound.push({
                id: recipe.id,
                title: recipe.title,
                displayIngredients: recipe.ingredients.map(i => i.name),
                missing: missing,
                score: score,
                author: recipe.author
            });
        }
    });

    matchesFound.sort((a, b) => b.score - a.score);
    renderResults(matchesFound);
}

function renderResults(recipes) {
    if (!resultsContainerEl) return;
    resultsContainerEl.innerHTML = '';

    if (recipes.length === 0) {
        resultsContainerEl.innerHTML = `<div class="empty-state"><p>Рецептов не найдено. Попробуйте расширить список!</p></div>`;
        return;
    }

    const user = JSON.parse(localStorage.getItem('currentUser'));
    const favKey = user ? `fav_${user.name}` : 'fav_guest';
    let favorites = JSON.parse(localStorage.getItem(favKey)) || [];

    recipes.forEach(r => {
        const isLowMatch = r.score < 50;
        const badgeClass = isLowMatch ? 'relevance-score low' : 'relevance-score';

        const linkId = r.author ? `cloud_${r.id}` : String(r.id);
        const isFav = favorites.includes(linkId);

        // Исправлено: добавлена строка с автором
        const authorHTML = r.author ? `<div style="font-size:0.8rem; color:#888; margin-top:5px;">Автор: ${r.author}</div>` : '';

        const missingHTML = r.missing.length > 0
            ? `<div class="missing-ingredients">❌ Не хватает: ${r.missing.join(', ')}</div>`
            : `<div class="all-match">✅ У вас есть всё для этого блюда!</div>`;

        resultsContainerEl.innerHTML += `
            <div class="recipe-card">
                <div class="recipe-info">
                    <h3 class="recipe-title">
                        <a href="recipe-single.html?id=${linkId}" style="color: inherit; text-decoration: none;">${r.title}</a>
                    </h3>
                    ${authorHTML}
                    <div class="recipe-details">Состав: ${r.displayIngredients.join(', ')}</div>
                    ${missingHTML}
                </div>
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 10px;">
                    <div class="${badgeClass}">${r.score}% совпало</div>
                    <button class="fav-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite('${linkId}', event)">${isFav ? '❤️' : '🤍'}</button>
                </div>
            </div>
        `;
    });
}

function renderCatalog(categoryFilter = 'all') {
    const catalogContainer = document.getElementById('catalog-container');
    if (!catalogContainer) return;
    catalogContainer.innerHTML = '';

    const filteredRecipes = recipeDatabase.filter(recipe => {
        if (categoryFilter === 'all') return true;
        return recipe.category === categoryFilter;
    });

    if (filteredRecipes.length === 0) {
        catalogContainer.innerHTML = '<p style="color: var(--text-muted);">В этой категории пока нет рецептов.</p>';
        return;
    }

    const user = JSON.parse(localStorage.getItem('currentUser'));
    const favKey = user ? `fav_${user.name}` : 'fav_guest';
    let favorites = JSON.parse(localStorage.getItem(favKey)) || [];

    filteredRecipes.forEach(recipe => {
        let categoryName = 'Блюдо';
        if (recipe.category === 'breakfast') categoryName = '🍳 Завтрак';
        if (recipe.category === 'soups') categoryName = '🍜 Суп';
        if (recipe.category === 'main-dishes') categoryName = '🥩 Горячее';
        if (recipe.category === 'salads') categoryName = '🥗 Салат';
        if (recipe.category === 'snacks') categoryName = '🍿 Закуска';
        if (recipe.category === 'baking') categoryName = '🍰 Выпечка';
        if (recipe.category === 'drinks') categoryName = '🍹 Напиток';
        if (recipe.category === 'sauces') categoryName = '🍯 Соус';

        const linkId = recipe.author ? `cloud_${recipe.id}` : String(recipe.id);
        const isFav = favorites.includes(linkId);
        const ingString = recipe.ingredients.map(i => i.name).join(', ');

        // Исправлено: добавлена строка с автором
        const authorHTML = recipe.author ? `<div style="font-size:0.8rem; color:#888; margin-top:5px;">Автор: ${recipe.author}</div>` : '';

        catalogContainer.innerHTML += `
            <div class="recipe-card">
                <div class="recipe-info">
                    <h3 class="recipe-title">
                        <a href="recipe-single.html?id=${linkId}" style="color: inherit; text-decoration: none;">${recipe.title}</a>
                    </h3>
                    ${authorHTML}
                    <div class="recipe-details" style="margin-top: 5px;">Состав: ${ingString}</div>
                    <div style="margin-top:5px; font-size:0.85rem; color:var(--text-muted)">⏱️ ${recipe.time || '30 мин'} | Сложность: ${getDifficultyFire(recipe.difficulty)}</div>
                </div>
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 10px;">
                    <div class="badge" style="background: #eef2f3; color: #333; font-weight: 500;">${categoryName}</div>
                    <button class="fav-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite('${linkId}', event)">${isFav ? '❤️' : '🤍'}</button>
                </div>
            </div>
        `;
    });
}

function filterCatalog(category, event) {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    renderCatalog(category);
}

function addConstructorItem(type) {
    if (type === 'ing') {
        const inputName = document.getElementById('recipe-ing-input');
        const inputAmount = document.getElementById('recipe-ing-amount');
        if (!inputName || !inputAmount) return;

        const nameVal = inputName.value.trim().toLowerCase();
        let amountVal = inputAmount.value.trim();

        if (!amountVal) amountVal = "по вкусу";

        if (nameVal) {
            let cleanName = synonymDictionary[nameVal] ? synonymDictionary[nameVal] : nameVal;
            if (!constructorIngredients.some(i => i.name === cleanName)) {
                constructorIngredients.push({ name: cleanName, amount: amountVal });
                renderConstructorList('ing');
            }
        }
        inputName.value = '';
        inputAmount.value = '';
    } else if (type === 'step') {
        const input = document.getElementById('recipe-step-input');
        if (!input) return;
        const val = input.value.trim();
        if (val && !constructorSteps.includes(val)) {
            constructorSteps.push(val);
            renderConstructorList('step');
        }
        input.value = '';
    }
}

function renderConstructorList(type) {
    if (type === 'ing') {
        const listEl = document.getElementById('constructor-ing-list');
        if (!listEl) return;
        listEl.innerHTML = constructorIngredients.map((item, index) =>
            `<li><strong>${item.name}</strong> — ${item.amount} <span onclick="removeConstructorItem('ing', ${index})">&times;</span></li>`
        ).join('');
    } else if (type === 'step') {
        const listEl = document.getElementById('constructor-step-list');
        if (!listEl) return;
        listEl.innerHTML = constructorSteps.map((item, index) =>
            `<li>${item} <span onclick="removeConstructorItem('step', ${index})">&times;</span></li>`
        ).join('');
    }
}

function removeConstructorItem(type, index) {
    if (type === 'ing') {
        constructorIngredients.splice(index, 1);
        renderConstructorList('ing');
    } else if (type === 'step') {
        constructorSteps.splice(index, 1);
        renderConstructorList('step');
    }
}

async function createNewRecipe(event) {
    event.preventDefault();
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
        alert('Ошибка! Добавлять рецепты могут только авторизованные пользователи.');
        return;
    }

    const title = document.getElementById('recipe-name').value.trim();
    const category = document.getElementById('recipe-category').value;
    const time = document.getElementById('recipe-time').value.trim();
    const difficulty = document.getElementById('recipe-difficulty').value;

    if (constructorIngredients.length === 0 || constructorSteps.length === 0) {
        alert('Пожалуйста, добавьте хотя бы один ингредиент и один шаг приготовления!');
        return;
    }

    const newRecipe = {
        title: title,
        category: category,
        time: time,
        difficulty: difficulty,
        ingredients: constructorIngredients,
        steps: constructorSteps,
        author: user.email,
        image: ""
    };

    try {
        const { error } = await supabaseClient
            .from('customRecipes')
            .insert([newRecipe]);

        if (error) throw error;

        alert('Ваш рецепт успешно опубликован!');
        window.location.href = 'catalog.html';
    } catch (err) {
        alert('Ошибка при публикации: ' + err.message);
    }
}

function toggleAuthMode() {
    const titleEl = document.getElementById('auth-title');
    const submitBtnEl = document.getElementById('auth-submit-btn');
    const toggleBtnEl = document.getElementById('auth-toggle-btn');
    const formEl = document.getElementById('auth-form');

    if (!titleEl || !submitBtnEl || !toggleBtnEl) return;

    if (formEl) formEl.reset();

    if (currentAuthMode === 'login') {
        currentAuthMode = 'register';
        titleEl.innerText = 'Регистрация';
        submitBtnEl.innerText = 'Зарегистрироваться';
        toggleBtnEl.innerText = 'Войти';
    } else {
        currentAuthMode = 'login';
        titleEl.innerText = 'Вход в систему';
        submitBtnEl.innerText = 'Войти';
        toggleBtnEl.innerText = 'Регистрация';
    }
}

async function handleAuth(event) {
    event.preventDefault();

    const email = document.getElementById('auth-email').value.trim().toLowerCase();
    const password = document.getElementById('auth-password').value;
    const name = email.split('@')[0];

    if (!supabaseClient) {
        alert('Ошибка подключения к базе данных Supabase!');
        return;
    }

    if (currentAuthMode === 'register') {
        try {
            const { data: existingUser, error: checkError } = await supabaseClient
                .from('registeredUsers')
                .select('email')
                .eq('email', email)
                .maybeSingle();

            if (existingUser) {
                alert('Пользователь с таком email уже зарегистрирован!');
                return;
            }

            const { error: insertError } = await supabaseClient
                .from('registeredUsers')
                .insert([{ name: name, email: email, password: password }]);

            if (insertError) throw insertError;

            localStorage.setItem('currentUser', JSON.stringify({ name: name, email: email }));
            alert('Регистрация прошла успешно!');
            window.location.href = 'profile.html';
        } catch (err) {
            alert('Ошибка регистрации: ' + err.message);
        }

    } else {
        try {
            const { data: foundUser, error: loginError } = await supabaseClient
                .from('registeredUsers')
                .select('*')
                .eq('email', email)
                .eq('password', password)
                .maybeSingle();

            if (!foundUser) {
                alert('Неверный email или пароль!');
                return;
            }

            localStorage.setItem('currentUser', JSON.stringify({ name: foundUser.name, email: foundUser.email }));
            alert(`Рады возвращению, ${foundUser.name}!`);
            window.location.href = 'profile.html';
        } catch (err) {
            alert('Ошибка авторизации: ' + err.message);
        }
    }
}

function checkUserSession() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const profileBlock = document.getElementById('profile-block');
    const redirectBlock = document.getElementById('profile-redirect-block');
    if (user) {
        if (profileBlock) profileBlock.style.display = 'block';
        if (redirectBlock) redirectBlock.style.display = 'none';
        document.getElementById('user-display-name').innerText = user.name;
        loadPantryCheckboxes();
    } else {
        if (profileBlock) profileBlock.style.display = 'none';
        if (redirectBlock) redirectBlock.style.display = 'block';
    }
}

function handleLogout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

function loadPantryCheckboxes() {
    const savedPantry = JSON.parse(localStorage.getItem('userPantry')) || ["соль", "перец", "вода", "масло"];
    const checkboxes = document.querySelectorAll('#pantry-form input[type="checkbox"]');
    checkboxes.forEach(cb => { cb.checked = savedPantry.includes(cb.value); });
}

function savePantry(evt) {
    evt.preventDefault();
    const checkboxes = document.querySelectorAll('#pantry-form input[type="checkbox"]');
    const selectedIngredients = [];
    checkboxes.forEach(cb => { if (cb.checked) selectedIngredients.push(cb.value); });
    localStorage.setItem('userPantry', JSON.stringify(selectedIngredients));
    alert('Ваша кладовая успешно обновлена!');
}

function renderMyRecipes() {
    const container = document.getElementById('my-recipes-container');
    if (!container) return;
    container.innerHTML = '';

    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) return;

    const userName = JSON.parse(currentUser).name;
    const myFiltered = recipeDatabase.filter(r => r.author === userName);

    if (myFiltered.length === 0) {
        container.innerHTML = `<p style="color: var(--text-muted); padding:20px 0;">Вы еще не добавили ни одного рецепта.</p>`;
        return;
    }

    myFiltered.forEach(recipe => {
        const uniqueId = `cloud_${recipe.id}`;
        const ingString = recipe.ingredients.map(i => i.name).join(', ');
        container.innerHTML += `
            <div class="recipe-card">
                <div class="recipe-info">
                    <h3 class="recipe-title"><a href="recipe-single.html?id=${uniqueId}" style="color:inherit; text-decoration:none;">${recipe.title}</a></h3>
                    <div class="recipe-details">Состав: ${ingString}</div>
                </div>
                <button class="delete-recipe-btn" onclick="deleteMyRecipe(${recipe.id})">Удалить</button>
            </div>`;
    });
}

async function deleteMyRecipe(id) {
    if (!confirm('Удалить этот рецепт из общей базы?')) return;
    if (!supabaseClient) return;

    try {
        const { error } = await supabaseClient
            .from('customRecipes')
            .delete()
            .eq('id', id);

        if (error) throw error;

        alert('Рецепт успешно удален!');
        await loadRecipesFromCloud();
        renderMyRecipes();
    } catch (err) {
        alert('Не удалось удалить рецепт: ' + err.message);
    }
}

function toggleFavorite(recipeId, event) {
    event.preventDefault();
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const favKey = user ? `fav_${user.name}` : 'fav_guest';
    let favorites = JSON.parse(localStorage.getItem(favKey)) || [];

    const stringId = String(recipeId);
    const index = favorites.indexOf(stringId);
    const button = event.currentTarget || event.target;

    if (index === -1) {
        favorites.push(stringId);
        if (button) button.classList.add('active');
        if (button) button.innerText = '❤️';
    } else {
        favorites.splice(index, 1);
        if (button) button.classList.remove('active');
        if (button) button.innerText = '🤍';
    }
    localStorage.setItem(favKey, JSON.stringify(favorites));
    if (document.getElementById('favorites-container')) renderFavoritesPage();
}

function renderFavoritesPage() {
    const container = document.getElementById('favorites-container');
    if (!container) return;
    container.innerHTML = '';

    const user = JSON.parse(localStorage.getItem('currentUser'));
    const favKey = user ? `fav_${user.name}` : 'fav_guest';
    const favorites = JSON.parse(localStorage.getItem(favKey)) || [];

    const favRecipes = recipeDatabase.filter(r => {
        const uniqueId = r.author ? `cloud_${r.id}` : String(r.id);
        return favorites.includes(uniqueId);
    });

    if (favRecipes.length === 0) {
        container.innerHTML = `<p style="color:var(--text-muted);">У вас пока нет сохраненных рецептов.</p>`;
        return;
    }

    favRecipes.forEach(recipe => {
        const uniqueId = recipe.author ? `cloud_${recipe.id}` : String(recipe.id);
        const ingString = recipe.ingredients.map(i => i.name).join(', ');
        container.innerHTML += `
            <div class="recipe-card">
                <div class="recipe-info">
                    <h3 class="recipe-title"><a href="recipe-single.html?id=${uniqueId}" style="color:inherit; text-decoration:none;">${recipe.title}</a></h3>
                    <div class="recipe-details">Состав: ${ingString}</div>
                </div>
                <button class="fav-btn active" onclick="toggleFavorite('${uniqueId}', event)">❤️</button>
            </div>`;
    });
}

function renderSingleRecipePage() {
    const recipeContainer = document.getElementById('recipe-full-details');
    if (!recipeContainer) return;

    const urlParams = new URLSearchParams(window.location.search);
    const rawId = urlParams.get('id');

    if (!rawId) {
        recipeContainer.innerHTML = `<h2>⚠️ ID рецепта не указан.</h2><br><a href="catalog.html" class="back-link">Вернуться в каталог</a>`;
        return;
    }

    let currentRecipe;

    if (String(rawId).startsWith('cloud_')) {
        const cloudId = Number(rawId.replace('cloud_', ''));
        currentRecipe = recipeDatabase.find(r => r.author !== undefined && Number(r.id) === cloudId);
    } else {
        const recipeId = Number(rawId);
        currentRecipe = recipeDatabase.find(r => r.author === undefined && Number(r.id) === recipeId);
    }

    if (!currentRecipe) {
        recipeContainer.innerHTML = `
            <h2>⚠️ Рецепт не найден.</h2>
            <br><a href="catalog.html" class="back-link">Вернуться в каталог</a>`;
        return;
    }

    let ingredientsHTML = currentRecipe.ingredients.map(i => `<li><strong>${i.name}</strong> — ${i.amount}</li>`).join('');
    let stepsHTML = currentRecipe.steps.map(s => `<li>${s}</li>`).join('');

    // Исправлено: добавлена строка с автором
    const authorDisplay = currentRecipe.author ? `<p style="color:#ff6b6b; font-weight:bold;">Автор рецепта: ${currentRecipe.author}</p>` : '';

    recipeContainer.innerHTML = `
        <div class="recipe-full-container">
            <h1 class="recipe-full-title">🍽️ ${currentRecipe.title}</h1>
            ${authorDisplay}

            <div class="recipe-meta-tags" style="margin: 15px 0 25px 0; display:flex; gap:10px;">
                <span class="badge" style="background: #f5f5f5; color: #333; padding: 6px 12px; border-radius:15px; font-size:0.9rem;">⏱️ ${currentRecipe.time || '30 мин'}</span>
                <span class="badge" style="background: #e3f2fd; color: #1e88e5; padding: 6px 12px; border-radius:15px; font-size:0.9rem;">Сложность: ${getDifficultyFire(currentRecipe.difficulty)}</span>
            </div>

            <h3 class="recipe-section-title">Ингредиенты:</h3>
            <ul class="ingredients-list" style="margin-bottom: 25px; padding-left: 20px;">
                ${ingredientsHTML}
            </ul>

            <h3 class="recipe-section-title">Способ приготовления:</h3>
            <ol class="steps-list" style="padding-left: 20px; line-height: 1.6;">
                ${stepsHTML}
            </ol>
        </div>
    `;
}

const blogDatabase = [
    {
        id: 1,
        category: "lifehacks",
        badge: "Лайфхак",
        title: "Как спасти пересоленный суп или соус?",
        text: "Если рука дрогнула и соли оказалось слишком много, не паникуйте. Самый простой способ — очистить сырой картофель, разрезать его пополам и бросить в кипящий суп на 10–15 минут. Картошка сработает как природный сорбент и впитает излишки соли."
    },
    {
        id: 2,
        category: "cheatsheets",
        badge: "Шпаргалка",
        title: "Чем заменить ингредиенты в рецептах?",
        text: "Забыли купить нужный продукт? Ловите шпаргалку быстрых замен:<br><br>• Вместо яйца: половина размятого банана или 1 ст. л. крахмала.<br>• Вместо майонеза: сметана с каплей горчицы."
    }
];

function renderBlog(categoryFilter = 'all') {
    const container = document.getElementById('blog-container');
    if (!container) return;
    container.innerHTML = '';

    const filtered = blogDatabase.filter(item => {
        if (categoryFilter === 'all') return true;
        return item.category === categoryFilter;
    });

    if (filtered.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); grid-column: 1/-1; text-align: center;">В этой категории пока нет статей.</p>';
        return;
    }

    filtered.forEach(item => {
        container.innerHTML += `
            <article class="blog-card">
                <div class="blog-badge">${item.badge}</div>
                <div class="blog-content">
                    <h3 class="blog-title">${item.title}</h3>
                    <p class="blog-text">${item.text}</p>
                </div>
            </article>`;
    });
}

function filterBlog(category, event) {
    const buttons = document.querySelectorAll('.blog-filter-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    renderBlog(category);
}
