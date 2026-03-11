// Updated app.js to support importing pasted table-style blocks

function importTableData(data) {
    const records = data.split('\n');
    const result = [];

    records.forEach(record => {
        const lines = record.split('\n');
        const userIdLine = lines[0];

        // Extract userId by checking if it contains a numeric user ID
        const userIdMatch = userIdLine.match(/\d+/);
        if (!userIdMatch) return;
        const userId = userIdMatch[0];

        const detailsLine = lines.find(line => line.includes('IPTV/TV')) || '';
        const nameMatch = detailsLine.match(/IPTV\/TV\s*(.*)/);
        const name = nameMatch ? nameMatch[1].trim() : '';

        const dateMatch = lines.find(line => /\d{2}\/\d{2}\/\d{4}/.test(line));
        const date = dateMatch ? dateMatch.match(/(\d{2}\/\d{2}\/\d{4})/)[1] : '';

        const frequencyMatch = detailsLine.match(/📅\s*(\d+\s*[MÊSES|ANOS]*)/);
        const frequency = frequencyMatch ? frequencyMatch[1] : '';

        // Add the cleaned up record to results
        result.push({
            userId: userId,
            name: name,
            date: date,
            frequency: frequency
        });
    });

    return result;
}

function fmtDate(dateStr) {
    const [day, month, year] = dateStr.split('/');
    return `${day}/${month}/${year}`;
}

// Update rendering in Clientes table
function renderClientes(clientes) {
    clientes.forEach(cliente => {
        console.log(`UserId: ${cliente.userId}, Name: ${cliente.name}, Date: ${fmtDate(cliente.date)}`);
    });
}

// Update CSV export
function exportCsv(clientes) {
    const csvContent = clientes.map(cliente => `${cliente.userId},${fmtDate(cliente.date)}`).join('\n');
    console.log(csvContent);
}

// Update Motor preview cards
function updateMotorPreviewCards(clientes) {
    clientes.forEach(cliente => {
        // logic to update motor cards
        console.log(`Updating card for ${cliente.name} with UserId: ${cliente.userId}`);
    });
}