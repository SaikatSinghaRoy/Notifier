
const webContainer = document.querySelector('.web-container');

const getData = () => {
    const saved = localStorage.getItem("notifier-data");
    if (!saved) return;

    const sites = JSON.parse(saved);

    sites.forEach(({ name, url, checked }) => {
        const box = document.createElement('div');
        box.className = 'box';
        box.innerHTML = `
            <label class="switch">
                <input type="checkbox" class="toggle-checkbox" ${checked ? 'checked' : ''} hidden />
                <div class="switch_wrapper">
                    <div class="switch_toggle"></div>
                </div>
            </label>
            <p class="name">${name}<a href="${url}">${url}</a></p>
            <button type="button" class="check-now">Check Now</button>
            <div class="delete-btn" data-id="${url}"></div>
        `;
        webContainer.appendChild(box);
    });
};

const saveData = () => {
    const data = [];
    document.querySelectorAll('.box').forEach(box => {
        const nameEl = box.querySelector('.name');
        const link = nameEl.querySelector('a');
        const name = nameEl.childNodes[0].textContent.trim();
        const url = link.getAttribute('href');
        const checked = box.querySelector('.toggle-checkbox').checked;

        data.push({ name, url, checked });
    });
    localStorage.setItem("notifier-data", JSON.stringify(data));
};



// to add new site, as user input
document.querySelector('.add-btn').addEventListener('click', () => {
    const name = document.querySelector('#input-name').value.toUpperCase();
    const url = document.querySelector('#input-url').value.trim();
    
    if(!name || !url) return;

    const currentBoxes = document.querySelectorAll('.box');
    if (currentBoxes.length >= 4) {
        document.querySelector('#input-name').value = '';
        document.querySelector('#input-url').value = '';
        alert("You can add at most 4 websites.");
        return;
    }

    chrome.runtime.sendMessage({
        type: "ADD_SITE",
        payload: {
            id: url,
            name,
            url,
            enabled: true
        }
    });

    const newElement = document.createElement('div');
    newElement.setAttribute('class', 'box');
    newElement.innerHTML = `
        <label class="switch">
            <input type="checkbox" class="toggle-checkbox" checked hidden />
            <div class="switch_wrapper">
                <div class="switch_toggle"></div>
            </div>
        </label>
        <p class="name">${name}<a href="${url}" target="_blank">${url}</a></p>
        <button type="button" class="check-now">Check Now</button>
        <div class="delete-btn" data-id="${url}"></div>`;
    
    webContainer.append(newElement);
    document.querySelector('#input-name').value = '';
    document.querySelector('#input-url').value = '';
    saveData();
});

webContainer.addEventListener('click', (e) => {
    // delete button
    if(e.target.classList.contains("delete-btn")){
        e.target.closest('.box').remove();
        const id = e.target.dataset.id;
        chrome.runtime.sendMessage({ type: "DELETE_SITE", id });
    }
    // check now button
    if(e.target.classList.contains("check-now")){
        const parent = e.target.closest('.box');
        const url = parent.querySelector('a').getAttribute('href');
        chrome.runtime.sendMessage({ type: "CHECK_NOW", url });
    }

    saveData();
})

// toggle switch
webContainer.addEventListener('change', function(e) {
    if (e.target.classList.contains('toggle-checkbox')) {
        const parent = e.target.closest('.box');
        const url = parent.querySelector('a').getAttribute('href');
        const isEnabled = e.target.checked;

        chrome.runtime.sendMessage({
            type: "TOGGLE_SITE",
            id: url,
            enabled: isEnabled
        });

        saveData();
    }
});


getData();
