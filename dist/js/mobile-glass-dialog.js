const mobile = matchMedia('(max-width:768px), (orientation:landscape) and (max-height:500px)');

export function openGlassDialog(dialog) {
  if (!mobile.matches) { dialog.showModal(); return () => {}; }
  const backdrop = document.createElement('div');
  backdrop.className = 'mobile-glass-backdrop';
  document.body.append(backdrop);
  dialog.classList.add('mobile-glass-dialog');
  dialog.show();
  return () => { backdrop.remove(); dialog.classList.remove('mobile-glass-dialog'); };
}
