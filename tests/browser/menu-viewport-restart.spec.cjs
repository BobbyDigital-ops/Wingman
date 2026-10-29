const {test,expect}=require('@playwright/test');
const ui=page=>page.frameLocator('#wingman-new-interface iframe');
async function withinViewport(page,selector){
 const result=await ui(page).locator(selector).evaluate(el=>{
  const area=el.closest('#stage'),a=area.getBoundingClientRect(),b=el.getBoundingClientRect();
  return {top:b.top>=a.top-2,bottom:b.bottom<=a.bottom+2,left:b.left>=a.left-2,right:b.right<=a.right+2};
 });
 expect(result).toEqual({top:true,bottom:true,left:true,right:true});
}
test('campaign restart returns to pilot selection and begins a fresh run',async({page})=>{
 await page.goto('/');
 await ui(page).locator('[data-action="career"]').click();
 await ui(page).locator('[data-action="to-pilots"]').click();
 await ui(page).locator('[data-action="confirm-pilot"]').click();
 await ui(page).locator('[data-action="begin-career"]').click();
 await expect(ui(page).locator('.career-route')).toHaveCount(3);
 await page.evaluate(()=>{const key='wingman-road-to-ace-v1',s=JSON.parse(localStorage.getItem(key));s.wins=12;s.medals=['test-medal'];localStorage.setItem(key,JSON.stringify(s))});
 page.once('dialog',dialog=>dialog.accept());
 await ui(page).locator('[data-action="restart-run"]').click();
 await expect(ui(page).locator('.pilot-card')).toHaveCount(6);
 const reset=await page.evaluate(()=>JSON.parse(localStorage.getItem('wingman-road-to-ace-v1')));
 expect(reset.run).toBeNull();expect(reset.awaitingPilotSelection).toBe(true);
 await ui(page).locator('[data-action="confirm-pilot"]').click();
 await expect(ui(page).locator('[data-action="begin-career"]')).toBeVisible();
 const selected=await page.evaluate(()=>JSON.parse(localStorage.getItem('wingman-road-to-ace-v1')));
 expect(selected.awaitingPilotSelection).toBe(false);
 expect(selected.wins).toBe(12);
 expect(selected.medals).toContain('test-medal');
 await ui(page).locator('[data-action="begin-career"]').click();
 const fresh=await page.evaluate(()=>JSON.parse(localStorage.getItem('wingman-road-to-ace-v1')));
 expect(fresh.run.rank).toBe(1);expect(fresh.run.lives).toBe(3);
});
test('single-screen operations, opponent and pilot licence expose actions on landscape',async({page})=>{
 await page.goto('/');
 await ui(page).locator('[data-action="operations"]').click();
 await expect(ui(page).locator('.operation-ref')).toHaveCount(5);
 await withinViewport(page,'.operation-ref:last-child');
 await withinViewport(page,'.poster-operations .screen-actions');
 const image=await ui(page).locator('.operation-ref:first-child .operation-cover').evaluate(el=>{
  const a=el.getBoundingClientRect(),b=el.closest('.operation-ref').getBoundingClientRect();
  return {height:a.height,card:b.height};
 });
 expect(image.height).toBeGreaterThan(image.card*.8);
 await ui(page).locator('[data-action="home"]').click();
 await ui(page).locator('[data-action="career"]').click();
 await ui(page).locator('[data-action="to-pilots"]').click();
 await ui(page).locator('[data-action="confirm-pilot"]').click();
 await ui(page).locator('[data-action="begin-career"]').click();
 await withinViewport(page,'.career-back-row');
 await ui(page).locator('[data-action="licence"]').click();
 await withinViewport(page,'.licence-actions');
 await withinViewport(page,'.licence-card');
});
