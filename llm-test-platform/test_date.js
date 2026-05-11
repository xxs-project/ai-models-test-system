const timeStr = "5/9/2026, 4:16:28 PM";
const date = new Date(timeStr);
const year = date.getFullYear();
const month = String(date.getMonth() + 1).padStart(2, '0');
const day = String(date.getDate()).padStart(2, '0');
const hours = String(date.getHours()).padStart(2, '0');
const minutes = String(date.getMinutes()).padStart(2, '0');
const seconds = String(date.getSeconds()).padStart(2, '0');
console.log(`${year}-${month}-${day} ${hours}:${minutes}:${seconds}`);
