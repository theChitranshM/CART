// Dev: add real Holt listings to a guest bag (picks first enabled size).
const urls = process.env.URLS.split(',');
const log = [];
for (const u of urls) {
  await p.goto(u, {waitUntil:'domcontentloaded'}); await p.waitForTimeout(5000);
  const sizes = p.locator('button[class*="SizeSelector_list-item__button"]:not([disabled])');
  const n = await sizes.count();
  if (n) await p.evaluate(()=>document.querySelectorAll('.js-survey__container').forEach(e=>e.remove())); await sizes.nth(Math.min(2, n-1)).click({force:true}).catch(e=>log.push('size err '+e.message));
  await p.waitForTimeout(800);
  await p.locator('#addToCartButton').click({timeout:10000, force:true}).catch(e=>log.push('add err '+e.message.slice(0,100)));
  await p.waitForTimeout(3500);
  log.push(u.split('/').slice(-3,-2)[0] + ' sizes=' + n + ' bag=' + await p.locator('.js-mini-cart-link').innerText().catch(()=>'?'));
}
return log;
