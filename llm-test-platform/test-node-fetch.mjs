const url = 'https://api.opencode.cn/v1/models';
try {
  await fetch(url);
  console.log("success");
} catch(e) {
  console.error("error", e.message, e.cause);
}
