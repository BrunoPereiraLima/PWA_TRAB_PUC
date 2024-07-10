let changeItem = {};
let totalOrigem  = 0.0;
let totalDestino = 0.0;
let msgErro = "";
const itens = [];
const exchangerateApiKey = "7df58e5fe3cc18db0b199cba";
const itemList = document.getElementById('itemList');


/** */
document.addEventListener('DOMContentLoaded', () => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then(() => console.log('Service Worker Registered'))
            .catch(error => console.error('Service Worker Registration Failed:', error));
    }
});


/** */
async function getExChange(p_currencyTo,
    p_currencyFrom,
    p_amount) {
    try {
        $.blockUI({ message: '<h1><img src="../image/busy.gif" /> Just a moment...</h1>' });
        const response = await fetch(`https://v6.exchangerate-api.com/v6/${exchangerateApiKey}/pair/${p_currencyTo}/${p_currencyFrom}/${p_amount}`);

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        $.unblockUI();
        if (data.result === 'success') return data;
        throw new Error('API returned an error: ' + data['error-type']);
    } catch (error) { console.error('Error fetching data:', error); }
}


/** */
async function addItem() {
    const m_description = document.getElementById('itemDescription').value;
    const m_quantity = document.getElementById('itemQuantity').value;
    const m_value = document.getElementById('itemValue').value;
    const m_currencyTo = document.getElementById('currencyTo').value;
    const m_currencyFrom = document.getElementById('currencyFrom').value;

    if(m_description == "")                  msgErro += "Descrição do item não pode ser vazio\n"
    if(m_quantity == "" || m_quantity == 0) msgErro += "Quantidade/unidade deve ser maior que ZERO\n"
    if(m_value == "" || m_value == 0)       msgErro += "Valor deve ser maior que ZERO"


    if(msgErro !== ""){
        alert(msgErro);
        msgErro = "";
        return;
    }

    if (Object.keys(changeItem).length > 0) {
        let idx = itens.findIndex(item => item.id === changeItem.id);

        changeItem.m_description = m_description;
        changeItem.m_quantity = m_quantity;
        changeItem.m_value = m_value;
        changeItem.m_currencyTo = m_currencyTo;
        changeItem.m_currencyFrom = m_currencyFrom;

        itens[idx] = changeItem;
        await setItemList(itens[idx].id,
            m_description,
            m_quantity,
            m_currencyFrom,
            m_currencyTo,
            m_value);
    } else {
        await setItemList("",
            m_description,
            m_quantity,
            m_currencyFrom,
            m_currencyTo,
            m_value);
    }



    setTotais(m_currencyFrom, m_currencyTo);
    document.getElementById('itemDescription').value = null;
    document.getElementById('itemQuantity').value = 0;
    document.getElementById('itemValue').value = 0;
    changeItem = {}
}

/** */
async function setItemList(p_id,
    m_description,
    m_quantity,
    m_currencyFrom,
    m_currencyTo,
    m_value) {

    const m_aux = changeItem;
    await getExChange(m_currencyFrom,
        m_currencyTo,
        m_value)
        .then(result => {
            if (p_id !== "") {
                $(`#${p_id}`).html(`
                    ${m_aux.m_description} (Qtd. ${m_aux.m_quantity}) : 
                    ${formatCurrency(m_aux.m_value, 'en-US', m_aux.m_currencyFrom)} ${m_aux.m_currencyFrom} => 
                    ${formatCurrency((result.conversion_result*m_quantity), 'en-US', result.target_code)} ${result.target_code})
                    <div>
                        <button class="btn btn-sm btn-secondary mr-2" onclick="editItem('${p_id}')">
                            <i class="fas fa-pencil-alt"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteItem('${p_id}')">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>`)
            }
            else {
                const m_guid = generateGUID();
                const newItem = {
                    id: m_guid,
                    m_description,
                    m_quantity,
                    m_value,
                    valueTo: result.conversion_result,
                    m_currencyTo,
                    m_currencyFrom,
                };
                itens.push(newItem);

                const m_newItemDiv = document.createElement('div');
                m_newItemDiv.className = `item d-flex justify-content-between align-items-center mb-2 stripe-${itens.length%2}`;
                m_newItemDiv.id = m_guid;
                m_newItemDiv.innerHTML = `
                    ${m_description} (Qtd. ${m_quantity}) : ${formatCurrency(m_value, 'en-US', m_currencyFrom)} ${m_currencyFrom} => 
                    ${formatCurrency((result.conversion_result*m_quantity), 'en-US', result.target_code)} ${result.target_code}
                    <div>
                        <button class="btn btn-sm btn-secondary mr-2" onclick="editItem('${m_guid}')">
                            <i class="fas fa-pencil-alt"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteItem('${m_guid}')">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>`;

                itemList.appendChild(m_newItemDiv);
            }
        });
}


/** */
function editItem(p_guid) {
    const itemIndex = itens.findIndex(item => item.id === p_guid);
    if (itemIndex === -1) {
        alert('Erro ao recuperar o item. Exclua e adiciona novamente.')
        return;
    }

    changeItem = itens[itemIndex];
    document.getElementById('itemDescription').value = itens[itemIndex].m_description;
    document.getElementById('itemQuantity').value = itens[itemIndex].m_quantity;
    document.getElementById('itemValue').value = itens[itemIndex].m_value;
    document.getElementById('currencyTo').value = itens[itemIndex].m_currencyTo;
    document.getElementById('currencyFrom').value = itens[itemIndex].m_currencyFrom;
}


/** */
function deleteItem(p_guid) {
    const confirmation = confirm("Você tem certeza que deseja excluir este item?");
    if (confirmation) {
        const itemIndex = itens.findIndex(item => item.id === p_guid);
        if (itemIndex > -1) {
            const m_auxCurrencyFrom = itens[itemIndex].m_currencyFrom;
            const m_auxCurrencyTo   = itens[itemIndex].m_currencyTo;
            itens.splice(itemIndex, 1);

            setTotais(m_auxCurrencyFrom, m_auxCurrencyTo);
            const itemDiv = document.getElementById(p_guid);
            if (itemDiv) {
                itemDiv.remove();
            }
        }
    }
}


/** */
function setTotais(p_currencyFrom, p_currencyTo){
    totalOrigem = itens.reduce((accumulator, currentItem) => {
        return accumulator + (currentItem.m_value*currentItem.m_quantity);
    }, 0);
    totalDestino = itens.reduce((accumulator, currentItem) => {
        return accumulator + (currentItem.valueTo*currentItem.m_quantity);
    }, 0);

    document.getElementById('totalMoedaOrigem').innerHTML = `${formatCurrency(totalOrigem, 'en-US', p_currencyFrom)} (${p_currencyFrom})`;
    document.getElementById('totalMoedaDestino').innerHTML = `${formatCurrency(totalDestino, 'en-US', p_currencyTo)} (${p_currencyTo})`;
}


/** */
function generateGUID() {
    function s4() {//RFC 4122 - https://datatracker.ietf.org/doc/html/rfc4122
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' +
        '4' + s4().substr(0, 3) + '-' +
        (parseInt(s4().substr(0, 1), 16) & 0x3 | 0x8).toString(16) + s4().substr(1, 3) + '-' +
        s4() + s4() + s4();
}


/** */
function formatCurrency(value, locale = 'en-US', currency = 'USD') {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}