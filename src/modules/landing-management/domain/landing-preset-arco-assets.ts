/**
 * Estilos y Scripts extraídos fielmente de https://arco.mise.ar/
 * Replicación exacta del sistema de turnos, layout 3 columnas, diseño visual y micro-interacciones.
 */

export const ARCO_GLOBAL_CSS = ":root{--fondo-0:#0b0908;--fondo-1:#141110;--fondo-2:#1c1817;--fondo-3:#252020;--linea:#2c2624;--linea-viva:#3e3633;--texto:#f6f2ee;--texto-2:#c6beb7;--texto-3:#afa69f;--violeta:#814dfa;--violeta-claro:#9b7bff;--violeta-rgb:129 77 250;--acento-rgb:124 92 255;--azul:#1bcaff;--acento:#814dfa;--ambar:#e8a33d;--acento-tenue:rgb(var(--acento-rgb) / .14);--verde:#2fd98a;--rojo:#ff6b72;--r-factor:1;--r-sm:calc(8px * var(--r-factor));--r-md:calc(12px * var(--r-factor));--r-lg:calc(18px * var(--r-factor));--r-xl:calc(24px * var(--r-factor));--fuente:var(--f-texto), system-ui, sans-serif;--lightningcss-light: ;--lightningcss-dark:initial;color-scheme:dark}\n:root[data-tema=light]{--fondo-0:#fbf9f7;--fondo-1:#fff;--fondo-2:#f3efeb;--fondo-3:#e8e1db;--linea:#e7e1db;--linea-viva:#d4ccc4;--texto:#1c1613;--texto-2:#524940;--texto-3:#867b71;--lightningcss-light:initial;--lightningcss-dark: ;color-scheme:light}\n:root[data-tema=light] body{background:var(--fondo-0)}\n:root[data-tema=light] body:before{display:none}\n:root[data-tema=light][data-logoblanco] .panel__marca img:not(.logo-tema--clr){filter:invert()brightness(.9)}\n.panel__marca .logo-tema--clr,:root[data-tema=light] .panel__marca .logo-tema--osc{display:none}\n:root[data-tema=light] .panel__marca .logo-tema--clr{display:block}\n:root[data-tema=light] .panel,:root[data-tema=light] .tarjeta,:root[data-tema=light] .opin{background:#ffffffdb}\n:root[data-tema=light]{--violeta-claro:var(--violeta)}\n:root[data-tema=light] .bb-listo{background:linear-gradient(180deg, rgb(var(--acento-rgb)) 0%, var(--violeta) 55%, var(--acento-hondo,#6a3ae0) 100%)}\n:root[data-tema=light] .bb-servicio__sello,:root[data-tema=light] .serv__sello{background:linear-gradient(180deg, rgb(var(--acento-rgb)), var(--violeta))}\n:root[data-tema=light] .bb-confirmar:hover:not(:disabled),:root[data-tema=light] .bb-ok__link:hover,:root[data-tema=light] .espejo__cta:hover{background:rgb(var(--acento-rgb))}\n:root[data-tema=light] .noche{background:var(--fondo-2)}\n:root[data-tema=light] .botonRelieve{border-color:var(--linea-viva);background:#ffffffe6;box-shadow:0 1px 2px #1c16130d,0 10px 22px -14px #1c161347}\n:root[data-tema=light] .botonRelieve:hover{background:#fff;box-shadow:0 1px 2px #1c16130f,0 14px 26px -14px #1c161357}\n:root[data-tema=light] .reco__marca{color:#a01e36;background:#c828461f;border-color:#c8284659}\n:root[data-tema=light] .idsel__op:hover{background:#0000000d}\n:root[data-tema=light] .acceso:not(.es-principal){background:#ffffffd1}\n.tematog{z-index:60;border:1px solid var(--linea);background:color-mix(in srgb, var(--fondo-0) 82%, transparent);width:38px;height:38px;color:var(--texto-2);border-radius:50%;flex:none;place-items:center;transition:color .18s,border-color .18s,transform .18s;display:grid;position:fixed;top:15px;right:14px}\n.tematog:hover{color:var(--texto);border-color:var(--violeta);transform:translateY(-1px)}\n.idsel .tematog{position:static;top:auto;right:auto}\nhtml{font-size:calc(100% * var(--escala,1))}\nhtml,body{margin:0;padding:0}\nhtml{scroll-behavior:smooth}\nbody{background:var(--fondo-0);color:var(--texto);font-family:var(--fuente);-webkit-font-smoothing:antialiased;font-size:.9375rem;line-height:1.6}\n@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,:before,:after{transition-duration:.01ms!important;animation-duration:.01ms!important}}\nbody:before{content:\"\";pointer-events:none;background:radial-gradient(58% 44% at 14% 0%, rgb(var(--acento-rgb) / .16), transparent 68%);position:fixed;inset:0}\nbody:has(.suelto):before{opacity:.4}\n.pag{grid-template-columns:272px minmax(0,1fr) 380px;align-content:start;min-height:100vh;display:grid;position:relative}\n.panel{scrollbar-width:none;border:1px solid var(--linea);border-radius:var(--r-xl);background:rgb(var(--vidrio-rgb,20 22 31) / .72);-webkit-backdrop-filter:blur(18px);flex-direction:column;align-self:start;gap:30px;max-height:calc(100vh - 32px);margin:16px 0 16px 16px;padding:22px 18px;display:flex;position:sticky;top:16px;overflow:auto;box-shadow:0 24px 60px -30px #000000e6}\n.panel::-webkit-scrollbar{display:none}\n.panel__marca{padding:4px 10px 0;display:block}\n.panel__marca img{width:100%;max-width:var(--logo-alto,126px);height:auto;margin:0 auto;display:block}\n.panel__nav{flex-direction:column;gap:8px;display:flex}\n.acceso{border-radius:var(--r-boton,var(--r-md));border:1px solid var(--linea);color:var(--texto-2);background:#1b1e2acc;align-items:center;gap:12px;padding:13px 15px;font-size:.84375rem;font-weight:500;text-decoration:none;transition:color .22s,border-color .22s,background .22s,transform .22s;display:flex;position:relative}\n.acceso svg{opacity:.75;flex:none;transition:opacity .22s}\n.acceso:hover{color:var(--texto);border-color:var(--linea-viva);background:var(--fondo-3);transform:translate(2px)}\n.acceso:hover svg{opacity:1}\n.acceso.es-principal{background:var(--acento);color:#fff;border-color:#0000;font-weight:600;box-shadow:0 1px 2px #00000040}\n.acceso.es-principal svg{opacity:1}\n.acceso.es-principal:hover{filter:brightness(1.08);transform:translate(2px)}\n:root{--tinta-acento:#fff}\n.acceso.es-principal,.acceso.es-principal svg{color:var(--tinta-acento)}\n.saber{border-top:1px solid var(--linea);gap:11px;margin:0;padding:20px 4px 4px;list-style:none;display:grid}\n.saber li{color:var(--texto-2);padding-left:14px;font-size:.75rem;line-height:1.5;position:relative}\n.saber li:before{content:\"\";background:var(--violeta-claro);opacity:.8;border-radius:50%;width:5px;height:5px;position:absolute;top:7px;left:0}\n.centro{width:100%;max-width:900px;margin-inline:auto;padding:34px 40px 56px;position:relative}\n.orbitas-b{z-index:-1;pointer-events:none;width:100%;height:100%;position:fixed;inset:0}\n.orbitas-b circle{fill:none;stroke:rgb(var(--violeta-rgb) / .2);stroke-width:1.2px;vector-effect:non-scaling-stroke}\n:root[data-tema=light] .orbitas-b circle{stroke:rgb(var(--violeta-rgb) / .34)}\n.tapa{margin-bottom:22px}\n.tapa__eyebrow{letter-spacing:.2em;text-transform:uppercase;color:var(--violeta-claro);margin:0 0 8px;font-size:.6875rem;font-weight:600}\n.tapa__titulo{letter-spacing:-.035em;margin:0;font-size:clamp(1.875rem,4.4vw,2.875rem);font-weight:700;line-height:1.06}\n.tapa__titulo span{color:var(--texto-2);letter-spacing:-.02em;font-weight:400;display:block}\n.banda{border-radius:var(--r-lg);border:1px solid var(--linea);margin:0 0 18px;position:relative;overflow:hidden}\n.banda img{object-fit:cover;object-position:center center;filter:saturate(.78)brightness(.66);width:100%;height:214px;display:block}\n.banda:after{content:\"\";pointer-events:none;background:linear-gradient(#0000,#0b0c12eb);height:62%;position:absolute;inset:auto 0 0}\n.banda figcaption{z-index:1;color:#ffffffe0;font-size:.78125rem;font-weight:500;position:absolute;bottom:13px;left:18px;right:18px}\n:root[data-tema=light] .billete__sello{color:color-mix(in srgb, var(--estado) 62%, #000)}\n.especiales{margin-top:34px}\n.especiales--anuncio{--anu-linea:var(--acento-rgb);--anu-tinte:var(--violeta-rgb);--anu-piso:var(--fondo-1);--anu-t1:.26;--anu-t2:.07;--anu-t3:.15;--anu-brillo:.26;--anu-talon:0px;--anu-muesca:9px;--anu-lleno:linear-gradient(172deg, var(--violeta), var(--acento-hondo,var(--violeta)));isolation:isolate;border-radius:var(--r-lg);background:linear-gradient(155deg, rgb(var(--anu-tinte) / var(--anu-t1)), rgb(var(--anu-tinte) / var(--anu-t2)) 46%, rgb(var(--anu-tinte) / var(--anu-t3))) padding-box, linear-gradient(var(--anu-piso), var(--anu-piso)) padding-box, linear-gradient(135deg, rgb(var(--anu-linea) / .95), rgb(var(--anu-linea) / .24) 34%, rgb(var(--anu-linea) / .12) 64%, rgb(var(--anu-linea) / .5)) border-box;border:1px solid #0000;grid-template-columns:minmax(0,1fr);display:grid;position:relative;overflow:hidden}\n.especiales--anuncio.con-talon{--anu-talon:92px;grid-template-columns:var(--anu-talon) minmax(0, 1fr);background:radial-gradient(circle calc(var(--anu-muesca) + 1.5px) at calc(var(--anu-talon) + 1px) 0, transparent calc(var(--anu-muesca) - .3px), rgb(var(--anu-linea) / .6) var(--anu-muesca), rgb(var(--anu-linea) / .6) calc(var(--anu-muesca) + .7px), transparent calc(var(--anu-muesca) + 1.5px)) border-box, radial-gradient(circle calc(var(--anu-muesca) + 1.5px) at calc(var(--anu-talon) + 1px) 100%, transparent calc(var(--anu-muesca) - .3px), rgb(var(--anu-linea) / .35) var(--anu-muesca), rgb(var(--anu-linea) / .35) calc(var(--anu-muesca) + .7px), transparent calc(var(--anu-muesca) + 1.5px)) border-box, var(--anu-lleno) 0 0 / var(--anu-talon) 100% no-repeat padding-box, linear-gradient(155deg, rgb(var(--anu-tinte) / var(--anu-t1)), rgb(var(--anu-tinte) / var(--anu-t2)) 46%, rgb(var(--anu-tinte) / var(--anu-t3))) padding-box, linear-gradient(var(--anu-piso), var(--anu-piso)) padding-box, linear-gradient(135deg, rgb(var(--anu-linea) / .95), rgb(var(--anu-linea) / .24) 34%, rgb(var(--anu-linea) / .12) 64%, rgb(var(--anu-linea) / .5)) border-box;-webkit-mask:radial-gradient(circle var(--anu-muesca) at calc(var(--anu-talon) + 1px) 0, #0000 calc(var(--anu-muesca) - .5px), #000 var(--anu-muesca)) top / 100% 51% no-repeat, radial-gradient(circle var(--anu-muesca) at calc(var(--anu-talon) + 1px) 100%, #0000 calc(var(--anu-muesca) - .5px), #000 var(--anu-muesca)) bottom / 100% 51% no-repeat;-webkit-mask:radial-gradient(circle var(--anu-muesca) at calc(var(--anu-talon) + 1px) 0, #0000 calc(var(--anu-muesca) - .5px), #000 var(--anu-muesca)) top / 100% 51% no-repeat, radial-gradient(circle var(--anu-muesca) at calc(var(--anu-talon) + 1px) 100%, #0000 calc(var(--anu-muesca) - .5px), #000 var(--anu-muesca)) bottom / 100% 51% no-repeat;mask:radial-gradient(circle var(--anu-muesca) at calc(var(--anu-talon) + 1px) 0, #0000 calc(var(--anu-muesca) - .5px), #000 var(--anu-muesca)) top / 100% 51% no-repeat, radial-gradient(circle var(--anu-muesca) at calc(var(--anu-talon) + 1px) 100%, #0000 calc(var(--anu-muesca) - .5px), #000 var(--anu-muesca)) bottom / 100% 51% no-repeat}\n.especiales--anuncio.con-talon:before{content:\"\";z-index:1;top:calc(var(--anu-muesca) + 7px);bottom:calc(var(--anu-muesca) + 7px);left:calc(var(--anu-talon) - 1px);pointer-events:none;background:radial-gradient(circle,#ffffff80 .7px,#0000 1.1px) 0 0/2px 8px repeat-y;width:2px;position:absolute}\n.especiales--anuncio:after{content:\"\";z-index:1;pointer-events:none;background:linear-gradient(105deg, transparent 41%, rgb(255 255 255/var(--anu-brillo)) 50%, transparent 59%), linear-gradient(105deg, transparent 22%, rgb(255 255 255/calc(var(--anu-brillo) * .28)) 50%, transparent 78%);animation:8s cubic-bezier(.45,.05,.3,1) 1.2s infinite anuncioReflejo;position:absolute;inset:0;transform:translate(-110%)}\n.especiales--anuncio .tapa__eyebrow{margin-bottom:8px}\n.especiales--anuncio .tapa__titulo--chico{margin-bottom:10px}\n.especiales--anuncio .tapa__titulo span,:root[data-tema=light] .especiales--anuncio .tapa__titulo span{color:var(--violeta-claro)}\n.especiales--anuncio .especiales__texto--anuncio{max-width:56ch;color:var(--texto);margin:0;font-size:.875rem;line-height:1.6}\n.especiales__texto--anuncio strong{color:var(--violeta-claro);font-weight:700}\n:root[data-tema=light] .especiales--anuncio{--anu-linea:var(--violeta-rgb);--anu-piso:#fff;--anu-t1:.15;--anu-t2:.04;--anu-t3:.09;--anu-brillo:.42;box-shadow:0 22px 44px -30px #1c16134d}\n:root[data-tema=light] .especiales__texto--anuncio strong{color:var(--acento-hondo,var(--violeta))}\n@media (max-width:520px){.especiales--anuncio.con-talon{--anu-talon:70px;--anu-muesca:8px}.anuncio__numero{font-size:2.375rem}.anuncio__semana,.anuncio__mes{letter-spacing:.16em;padding-left:.16em;font-size:.625rem}.anuncio__cuerpo,.con-talon .anuncio__cuerpo{padding:18px 18px 18px 20px}}\n@media (prefers-reduced-motion:reduce){.especiales--anuncio:after{animation:none;display:none}.anuncio__ir,.anuncio__ir svg{transition:none}}\n.tapa__titulo--chico{margin-bottom:14px;font-size:clamp(1.5rem,3.2vw,2.125rem)}\n.especiales__texto{color:var(--texto-2);margin:0 0 18px;font-size:.78125rem;line-height:1.6}\n.especiales__botones{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;display:grid}\n.botonRelieve{border-radius:var(--r-md);border:1px solid var(--linea);color:var(--texto);letter-spacing:-.01em;white-space:normal;background:linear-gradient(#ffffff0b,#ffffff03);align-items:center;gap:12px;padding:16px 18px;font-size:.875rem;font-weight:600;line-height:1.3;text-decoration:none;transition:border-color .28s,background .28s,transform .22s,box-shadow .28s;display:flex;position:relative;overflow:hidden}\n.botonRelieve:after{content:\"\";background:linear-gradient(105deg, transparent 38%, rgb(var(--acento-rgb) / .16) 50%, transparent 62%);pointer-events:none;transition:transform .75s;position:absolute;inset:0;transform:translate(-130%)}\n.botonRelieve:hover{border-color:rgb(var(--acento-rgb) / .55);background:linear-gradient(#ffffff12,#ffffff05);transform:translateY(-1px)}\n.botonRelieve:hover:after{transform:translate(130%)}\n.botonRelieve:active{transform:translateY(0)}\n.botonRelieve svg{color:var(--violeta-claro);z-index:1;flex:none;position:relative}\n.botonRelieve span{z-index:1;flex:1;min-width:0;position:relative}\n.botonRelieve__flecha{color:var(--violeta-claro);z-index:1;flex:none;font-size:.9375rem;font-style:normal;transition:transform .2s;position:relative}\n.botonRelieve:hover .botonRelieve__flecha{transform:translate(3px)}\n.wspCta{border-radius:var(--r-lg);background:linear-gradient(var(--fondo-1), var(--fondo-1)) padding-box, var(--acento) border-box;color:var(--texto);text-align:center;border:1px solid #0000;padding:15px 20px;text-decoration:none;transition:transform .22s,box-shadow .22s;display:block;position:relative;overflow:hidden}\n.wspCta:before{content:\"\";background:radial-gradient(70% 120% at 50% 118%, rgb(var(--acento-rgb) / .35), transparent 70%);opacity:.55;transition:opacity .25s;position:absolute;inset:0}\n.wspCta:hover{transform:translateY(-2px);box-shadow:0 4px 10px -4px #00000059}\n.wspCta:hover:before{opacity:1}\n.wspCta:active{transform:translateY(0)}\n.wspCta__cuerpo{letter-spacing:-.015em;justify-content:center;align-items:center;gap:9px;font-size:1.09375rem;font-weight:600;display:inline-flex;position:relative}\n.wspCta__cuerpo svg{color:var(--violeta-claro);flex:none}\n.wspCta--panel{border:1px solid var(--linea-viva);background:var(--fondo-1);transition:border-color .25s,color .25s;display:none}\n.wspCta--panel:before{display:none}\n.wspCta--panel:hover{border-color:var(--violeta);box-shadow:none;transform:none}\n.wspCta--panel svg{color:var(--violeta-claro);flex:none}\n.costado{flex-direction:column;align-self:end;gap:14px;margin:0 40px 56px 0;display:flex}\n.tarjeta{border:1px solid var(--linea);border-radius:var(--r-lg);background:rgb(var(--vidrio-rgb,20 22 31) / .72);-webkit-backdrop-filter:blur(18px);padding:18px}\n.tarjeta__titulo{letter-spacing:.01em;color:var(--texto-2);margin:0 0 14px;font-size:.78125rem;font-weight:600}\n.tarjeta--puntaje{color:var(--violeta-claro);align-items:center;gap:15px;text-decoration:none;transition:border-color .2s,transform .2s;display:flex}\n.tarjeta--puntaje:hover{border-color:var(--violeta);transform:translateY(-1px)}\n.puntaje{flex-direction:column;flex:none;margin:0;display:flex}\n.puntaje strong{letter-spacing:-.03em;font-size:1.875rem;font-weight:700;line-height:1}\n.puntaje__estrellas{margin-top:6px;line-height:0;display:block}\n.estrellas__apagadas{fill:rgb(var(--acento-rgb) / .22)}\n.estrellas__prendidas{fill:var(--violeta-claro)}\n.puntaje__pie{color:var(--texto-2);margin:0;font-size:.78125rem;line-height:1.45}\n.puntaje__pie strong{color:var(--texto);font-weight:600}\n.reco{margin:0}\n.reco+.reco{border-top:1px solid var(--linea);margin-top:16px;padding-top:16px}\n.reco img{object-fit:cover;border-radius:var(--r-md);width:100%;height:116px;margin-bottom:12px;display:block}\n.reco__tipo{letter-spacing:.14em;text-transform:uppercase;color:var(--violeta-claro);margin:0 0 3px;font-size:.65625rem;font-weight:600}\n.reco__nombre{letter-spacing:-.015em;margin:0 0 6px;font-size:.9375rem;font-weight:600}\n.reco__detalle{color:var(--texto-2);margin:0;font-size:.78125rem;line-height:1.55}\n.reco__marca{border:1px solid rgb(var(--acento-rgb) / .5);background:var(--acento-tenue);letter-spacing:.06em;color:var(--violeta-claro);vertical-align:1px;border-radius:999px;margin-left:6px;padding:1px 9px;font-size:.625rem;font-weight:600;display:inline-block}\n.pie{text-align:center;grid-column:1/-1;padding:26px 40px 46px}\n.pie__marca{letter-spacing:.16em;text-transform:uppercase;color:var(--texto-2);margin:0;font-size:.6875rem;font-weight:500}\n.pie__marca strong{color:var(--texto);letter-spacing:.22em;font-weight:700}\n.pie__punto{opacity:.6;margin:0 9px}\n@media (max-width:1240px){.pag{grid-template-columns:272px minmax(0,1fr)}.costado{grid-column:2;grid-template-columns:repeat(2,minmax(0,1fr));align-items:start;gap:14px;margin:0 40px 40px;display:grid}}\n@media (max-width:940px){.pag{grid-template-columns:1fr}.costado{grid-column:1;grid-template-columns:1fr;margin:0 14px 10px}.panel{flex-flow:wrap;align-items:center;gap:16px;height:auto;margin:30px 0 6px;padding:16px;position:static}.panel__nav{flex-flow:wrap;flex:1}.acceso{padding:11px 14px;font-size:.8125rem}.panel__marca{padding:0}.panel__marca img{max-width:var(--logo-alto-tableta,128px)}.saber{grid-template-columns:1fr 1fr;gap:8px 18px;width:100%;margin-top:4px}.centro{padding:22px 14px 44px}.tapa{flex-direction:column;gap:10px}.tapa__lugar{text-align:left}.banda img{height:108px}.reserva{padding:22px 18px 26px}.especiales__botones,.formulario,.billete{grid-template-columns:1fr}.soloWeb{display:none}.soloCel{display:inline}.billete__talon{border-left:0;border-top:1px dashed var(--linea-viva)}}\n@media (max-width:560px){.panel__marca{width:100%}.acceso{flex:calc(50% - 4px);justify-content:center}}\n.extra,.costado,.der{align-self:start;position:sticky;top:16px}\n.general__texto{color:var(--texto-2);margin:0 0 12px;font-size:.90625rem;line-height:1.7}\n.general__texto strong{color:var(--texto);font-weight:600}\n.galeria{grid-template-columns:repeat(4,1fr);gap:8px;margin-top:18px;display:grid}\n.galeria img{object-fit:cover;border-radius:calc(12px * var(--r-factor,1));border:1px solid var(--linea);width:100%;height:96px}\n.galeria__grande{grid-column:1/-1;height:240px!important}\n@media (max-width:620px){.galeria{grid-template-columns:repeat(2,1fr)}.galeria__grande{height:180px!important}}\n.wspCta{padding:17px 18px}\n.wspCta__cuerpo{white-space:nowrap;flex-wrap:nowrap;font-size:clamp(.9375rem,1.35vw,1.09375rem)}\n.ofrece{gap:14px;margin-top:22px;display:grid}\n.ofrece__grupo{gap:7px;display:grid}\n.ofrece__titulo{letter-spacing:.14em;text-transform:uppercase;color:var(--texto-3);margin:0;font-size:.6875rem;font-weight:700}\n.ofrece__chips{flex-wrap:wrap;gap:7px;display:flex}\n.ofrece__chips span{border-radius:calc(9px * var(--r-factor,1));background:linear-gradient(var(--fondo-1), var(--fondo-1)) padding-box, linear-gradient(145deg, rgb(var(--acento-rgb) / .65), rgb(var(--acento-rgb) / .12) 45%, #ffffff14) border-box;color:var(--texto-2);border:1px solid #0000;padding:7px 13px;font-size:.78125rem;position:relative;overflow:hidden;box-shadow:inset 0 1px #ffffff0d}\n.ofrece__chips span:before{content:\"\";background:linear-gradient(90deg,#0000,#ffffff80,#0000);width:26px;height:1px;position:absolute;top:0;left:8px}\n.ofrece__titulo{color:var(--violeta-claro)}\n.ofrece__chips span{border-color:rgb(var(--violeta-rgb) / .4);background:rgb(var(--violeta-rgb) / .09);color:var(--texto);padding:5px 10px;font-size:.75rem}\n.galeria__foto{cursor:zoom-in;background:0 0;border:0;padding:0;line-height:0}\n.galeria__foto img{transition:transform .25s,border-color .2s}\n.galeria__foto:hover img{border-color:var(--violeta);transform:scale(1.02)}\n.galeria{margin-top:30px}\n.galeria__foto{width:100%;display:block;height:auto!important}\n.galeria__grande{grid-column:1/-1}\n.galeria__grande img{object-position:50% 32%;height:280px!important}\n.galeria__foto img{height:96px}\n.galeria__media{grid-column:span 2}\n.galeria__media img{object-position:50% 30%;height:220px}\n.galeria__foto:nth-child(2){border-radius:calc(12px * var(--r-factor,1));border:1px solid var(--linea);transition:border-color .2s;overflow:hidden}\n.galeria__foto:nth-child(2):hover{border-color:var(--violeta)}\n.galeria__foto:nth-child(2) img{object-position:50% 42%;transform-origin:50% 12%;border:0;transform:scale(1.1)}\n.galeria__foto:nth-child(2):hover img{transform:scale(1.14)}\n.general{margin-top:40px;padding-top:6px}\n.general:before{content:none}\n.filete{width:min(430px,84%);color:var(--violeta);justify-content:center;align-items:center;gap:15px;margin:0 auto 36px;display:flex}\n.filete__hilo{background:linear-gradient(90deg, transparent, rgb(var(--violeta-rgb) / .12) 20%, rgb(var(--violeta-rgb) / .62));flex:1;height:1px;position:relative}\n.filete__hilo--der{transform:scaleX(-1)}\n.filete__hilo:after{content:\"\";border:1px solid rgb(var(--violeta-rgb) / .7);background:rgb(var(--violeta-rgb) / .16);width:4.5px;height:4.5px;margin-top:-2.25px;position:absolute;top:50%;right:-5px;transform:rotate(45deg)}\n.filete__hilo:before{content:\"\";opacity:0;background:linear-gradient(90deg,#0000,#e2d5ffe6,#0000) 100% 0/74px 100% no-repeat;animation:9s ease-in-out infinite fileteDestello;position:absolute;inset:0}\n.filete__joya{width:78px;height:49px;filter:drop-shadow(0 0 7px rgb(var(--violeta-rgb) / .35));flex:none}\n@media (prefers-reduced-motion:reduce){.filete__hilo:before{animation:none}}\n.especiales__botones{margin-bottom:6px}\n@media (max-width:620px){.galeria__grande img{height:200px!important}.galeria__media img{height:170px}}\nhtml,body{overflow-x:clip}\n@media (max-width:940px){.panel{max-height:none;overflow:visible}.costado{position:static}.filete{overflow:hidden}}\n@media (max-width:560px){.panel{gap:14px;padding:16px 16px 18px}.panel__marca{width:100%;padding:12px 0 16px}.panel__marca img{max-width:var(--logo-alto-celu,104px)}.saber{gap:10px 16px;padding-top:16px}.costado{gap:18px}.wspCta{margin-top:6px}.pie{padding:30px 14px 40px}.pie__ciudad{display:none}.pie__marca{white-space:nowrap;letter-spacing:.13em;font-size:.65625rem}}\n.pap{background:var(--fondo-0);flex-direction:column;width:100%;display:flex}\n.pap--sola{min-height:100dvh}\n.pap--sola .pap__pie{margin-top:0;position:sticky;bottom:0}\n.pap__barra{grid-template-columns:44px 1fr 44px;align-items:center;padding:14px 12px 10px;display:grid}\n.pap__atras{border:1px solid var(--linea);border-radius:calc(14px * var(--r-factor,1));width:40px;height:40px;color:var(--texto-2);cursor:pointer;background:0 0;font-size:1.375rem;line-height:1}\n.pap__atras:disabled{opacity:.3}\n.pap__centro{text-align:center}\n.pap__titulo{letter-spacing:-.02em;color:var(--texto);margin:0;font-size:1.0625rem;font-weight:600}\n.pap__cuenta{letter-spacing:.18em;text-transform:uppercase;color:var(--texto-3);margin:2px 0 0;font-size:.625rem;font-weight:500}\n.pap__avance{background:var(--linea);border-radius:2px;height:2px;margin:6px 20px 0;overflow:hidden}\n.pap__avance i{background:var(--violeta);border-radius:2px;height:100%;transition:width .3s cubic-bezier(.32,.72,0,1);display:block}\n.pap__migas{flex-wrap:wrap;gap:6px;padding:14px 20px 0;display:flex}\n.pap__miga{border:1px solid var(--linea);color:var(--texto-2);border-radius:999px;padding:5px 11px;font-size:.71875rem;font-weight:500}\n.pap__miga:first-letter{text-transform:uppercase}\n.pap__cuerpo{flex:1;padding:20px 20px 24px}\n.pap__cuerpo:has(.pap__form){padding-bottom:8px}\n.pap__ayuda{color:var(--texto-3);margin:14px 0 0;font-size:.78125rem;line-height:1.6}\n.pap__ayuda--centro{text-align:center}\n.pap__rotulo{letter-spacing:.18em;text-transform:uppercase;color:var(--texto-3);margin:26px 0 12px;font-size:.625rem;font-weight:600}\n.pap__mes{justify-content:space-between;align-items:center;margin-bottom:16px;display:flex}\n.pap__mesNombre{font-size:1rem;font-weight:600;display:inline-block}\n.pap__mesBoton{border:1px solid var(--linea);border-radius:calc(12px * var(--r-factor,1));width:38px;height:38px;color:var(--texto-2);cursor:pointer;background:0 0;font-size:1.1875rem}\n.pap__mesBoton:active{border-color:var(--violeta)}\n.pap__cal{grid-template-columns:repeat(7,1fr);gap:6px;display:grid}\n.pap__calDia{text-align:center;letter-spacing:.1em;color:var(--texto-3);padding-bottom:6px;font-size:.625rem;font-weight:600}\n.pap__celda{aspect-ratio:1;border-radius:calc(14px * var(--r-factor,1));background:var(--fondo-1);color:var(--texto);cursor:pointer;border:1px solid #0000;justify-content:center;align-items:center;font-size:.9375rem;font-weight:500;transition:border-color .16s,background .16s,transform .16s;display:flex;position:relative}\n.pap__celda:active{transform:scale(.94)}\n.pap__celda.es-bloqueada{color:var(--texto-3);opacity:.34;cursor:default;background:0 0}\n.pap__celda.es-elegida{background:var(--violeta);border-color:var(--violeta);color:#fff;font-weight:700}\n.pap__punto{background:var(--violeta-claro);border-radius:50%;width:4px;height:4px;position:absolute;bottom:7px}\n.pap__celda.es-elegida .pap__punto{background:#ffffffd9}\n.pap__gente{justify-items:center;padding:26px 0 0;display:grid}\n.pap__avatar{background:radial-gradient(circle at 50% 35%, rgb(var(--violeta-rgb) / .3), rgb(var(--violeta-rgb) / .06) 70%);border:1px solid rgb(var(--violeta-rgb) / .35);width:84px;height:84px;color:var(--violeta-claro);box-shadow:0 0 44px -10px rgb(var(--violeta-rgb) / .55);border-radius:50%;place-items:center;display:grid}\n.pap__contador{align-items:center;gap:26px;margin:30px 0 4px;display:flex}\n.pap__mas{border:1px solid var(--linea-viva);width:52px;height:52px;color:var(--texto);cursor:pointer;background:0 0;border-radius:50%;font-size:1.5rem;line-height:1;transition:border-color .16s,color .16s,transform .16s}\n.pap__mas:active{border-color:var(--violeta);transform:scale(.92)}\n.pap__mas:disabled{opacity:.28}\n.pap__numero{text-align:center;letter-spacing:-.04em;font-variant-numeric:tabular-nums;min-width:76px;font-size:3.75rem;font-weight:700;line-height:1}\n.pap__horas{grid-template-columns:repeat(3,1fr);gap:8px;display:grid}\n.pap__hora{border:1px solid var(--linea);border-radius:calc(14px * var(--r-factor,1));background:var(--fondo-1);color:var(--texto);font-variant-numeric:tabular-nums;cursor:pointer;padding:15px 0;font-size:.9375rem;font-weight:600;transition:border-color .16s,background .16s,transform .16s}\n.pap__hora:active{transform:scale(.96)}\n.pap__hora:disabled{opacity:.3;cursor:default}\n.pap__hora.es-elegida{background:var(--violeta);border-color:var(--violeta);color:#fff}\n.pap__momentos{border:1px solid var(--linea);border-radius:calc(14px * var(--r-factor,1));background:var(--fondo-1);grid-auto-columns:minmax(0,1fr);grid-auto-flow:column;margin:0 0 12px;display:grid;overflow:hidden}\n.pap__momento{color:var(--texto-2);font:inherit;cursor:pointer;background:0 0;border:0;padding:13px 6px;font-size:.875rem;font-weight:600;transition:background .16s,color .16s}\n.pap__momento+.pap__momento{border-left:1px solid var(--linea)}\n.pap__momento:hover{color:var(--texto)}\n.pap__momento.es-elegido{background:color-mix(in srgb, var(--violeta) 16%, transparent);color:var(--texto);box-shadow:inset 0 -2px 0 var(--violeta)}\n.pap__momento:focus-visible{outline:2px solid var(--violeta);outline-offset:-2px}\n.pap__sectores{gap:8px;display:grid}\n.pap__sector{border:1px solid var(--linea);border-radius:calc(16px * var(--r-factor,1));background:var(--fondo-1);text-align:left;cursor:pointer;gap:3px;padding:15px 16px;transition:border-color .16s,background .16s;display:grid}\n.pap__sector b{color:var(--texto);font-size:.9375rem;font-weight:600}\n.pap__sector small{color:var(--texto-3);font-size:.75rem}\n.pap__sector.es-elegido{border-color:var(--violeta);background:rgb(var(--violeta-rgb) / .12)}\n.pap__sector.es-elegido small{color:var(--violeta-claro)}\n.pap__sector.es-cerrado{opacity:.5;cursor:default}\n.pap__sector.es-cerrado b{text-decoration:line-through}\n.pap__sector.es-cerrado small{color:var(--acento)}\n.pap__sinLugar{gap:10px;display:grid}\n.pap__sinLugar p{color:var(--texto-2);margin:0;font-size:.875rem;line-height:1.65}\n.pap__ok{color:var(--verde)!important}\n.pap__secundario{border:1px solid var(--linea-viva);border-radius:calc(14px * var(--r-factor,1));color:var(--texto);cursor:pointer;background:0 0;padding:14px;font-size:.875rem;font-weight:600}\n.pap__ficha{border:1px solid var(--linea);border-radius:calc(18px * var(--r-factor,1));background:var(--fondo-1);align-items:center;gap:14px;padding:12px;display:flex}\n.pap__fichaFoto{border-radius:calc(14px * var(--r-factor,1));object-fit:cover;flex:none;width:72px;height:72px}\n.pap__fichaTexto{gap:5px;min-width:0;display:grid}\n.pap__fichaTexto b{letter-spacing:-.02em;font-size:1rem;font-weight:700}\n.pap__fichaTexto small{color:var(--texto-3);font-size:.78125rem}\n.pap__fichaZona{letter-spacing:.01em;color:var(--violeta-claro);font-size:.6875rem;font-weight:600}\n.pap__fichaNota{font-size:.71875rem;line-height:1.45}\n.pap__resumen{border-top:1px solid var(--linea);margin:16px 0 22px}\n.pap__resumen>div{border-bottom:1px solid var(--linea);justify-content:space-between;align-items:baseline;padding:12px 2px;display:flex}\n.pap__resumen dt{letter-spacing:.16em;text-transform:uppercase;color:var(--texto-3);font-size:.625rem;font-weight:500}\n.pap__resumen dd{margin:0;font-size:.9375rem;font-weight:600}\n.pap__resumen dd:first-letter{text-transform:uppercase}\n.pap__form{gap:14px;display:grid}\n.pap__marco{gap:6px;display:grid}\n.pap__marco>span{color:var(--texto-2);font-size:.71875rem;font-weight:600}\n.pap__marco em{color:var(--texto-3);font-style:normal;font-weight:400}\n.pap__campo{box-sizing:border-box;border:1px solid var(--linea);border-radius:calc(14px * var(--r-factor,1));background:var(--fondo-1);width:100%;color:var(--texto);padding:14px 15px;font-family:inherit;font-size:1rem}\n.pap__campo::placeholder{color:var(--texto-3)}\n.pap__campo:focus{border-color:var(--violeta);outline:none}\n.pap__cumple{grid-template-columns:minmax(0,.8fr) minmax(0,1.5fr);gap:8px;display:grid}\n.pap__sel{appearance:none;cursor:pointer;background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1.5l5 5 5-5' fill='none' stroke='%23999' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\");background-position:right 15px center;background-repeat:no-repeat;min-width:0;padding-right:38px}\n.pap__sel.es-vacio{color:var(--texto-3)}\n.pap__sel option{color:var(--texto)}\n.pap__trago{border:1px solid rgb(var(--violeta-rgb) / .3);border-radius:calc(14px * var(--r-factor,1));background:rgb(var(--violeta-rgb) / .08);color:var(--violeta-claro);margin:0;padding:12px 14px;font-size:.8125rem;line-height:1.55}\n.pap__error{color:var(--rojo);margin:14px 0 0;font-size:.84375rem}\n.pap__pie{padding:12px 20px calc(16px + env(safe-area-inset-bottom));background:linear-gradient(180deg, transparent, var(--fondo-0) 26%);margin-top:8px;position:static}\n.pap__seguir{border-radius:calc(16px * var(--r-factor,1));background:var(--violeta);color:#fff;letter-spacing:.01em;cursor:pointer;border:0;width:100%;padding:17px;font-family:inherit;font-size:.9375rem;font-weight:600;transition:filter .16s,transform .16s}\n.pap__seguir:active{transform:scale(.985)}\n.pap__seguir:disabled{opacity:.32;cursor:default}\n.pap__celda.es-llena{opacity:.5;text-decoration:line-through;text-decoration-thickness:1px}\n.pap__celda.es-llena.es-elegida{opacity:1;text-decoration:none}\n.pap__seguir--confirmar{background:linear-gradient(180deg, color-mix(in srgb, var(--violeta) 80%, #fff) 0%, var(--violeta) 55%, color-mix(in srgb, var(--violeta) 78%, #000) 100%);min-height:56px;color:var(--tinta-acento,#fff);padding:0 14px;font-weight:700;position:relative;overflow:hidden;box-shadow:inset 0 1px #fff6,inset 0 -1px #0000004d,0 1px 2px #00000047}\n.pap__seguir--confirmar:hover:not(:disabled):not(.es-apagado){filter:brightness(1.05);transform:translateY(-1px)}\n.pap__seguir--confirmar:after{content:\"\";pointer-events:none;background:linear-gradient(105deg,#0000 40%,#ffffff4d 50%,#0000 60%);animation:6s ease-in-out infinite papBrillo;position:absolute;inset:0;transform:translate(-130%)}\n.pap__seguir--confirmar.es-apagado{filter:grayscale(.5)brightness(.72);box-shadow:none}\n.pap__seguir--confirmar.es-apagado:after,.pap__seguir--confirmar:disabled:after{opacity:0;animation:none}\n.pap__seguir-cuerpo{z-index:1;justify-content:center;align-items:center;gap:11px;display:flex;position:relative}\n.pap__campana{flex:none;width:24px;height:24px;overflow:visible}\n.pap__campana-tapa{transform-box:view-box;transform-origin:6.5px 22.5px;transition:transform .34s cubic-bezier(.34,1.4,.64,1)}\n.pap__campana-vapor{opacity:0;transition:opacity .25s,transform .4s ease-out;transform:translateY(1.5px)}\n.pap__seguir--confirmar:hover:not(:disabled):not(.es-apagado) .pap__campana-tapa{transform:translate(-.5px,-3.6px)rotate(-14deg)}\n.pap__seguir--confirmar:hover:not(:disabled):not(.es-apagado) .pap__campana-vapor{opacity:.85;transition-delay:80ms;transform:translateY(-1px)}\n@media (prefers-reduced-motion:reduce){.pap__seguir--confirmar:after{opacity:0;animation:none}.pap__campana-tapa,.pap__campana-vapor{transition:none}}\n.pap__letra{text-align:center;color:var(--texto-3);margin:10px 0 0;font-size:.71875rem}\n.pap__letra--sena{color:var(--texto-2);max-width:36em;margin-left:auto;margin-right:auto;font-size:.78125rem;line-height:1.45}\n@media (prefers-reduced-motion:reduce){.pap__avance i,.pap__celda,.pap__hora,.pap__seguir,.pap__mas{transition:none}}\n@media (max-width:620px){.galeria__media{grid-column:span 1}.galeria__media img{aspect-ratio:1;object-position:50% 40%;height:auto}}\n.sectores__nota,.pap__nota{color:var(--texto-3);max-width:62ch;margin:0 0 12px;font-size:.78125rem;line-height:1.6}\n.pap__sector small{line-height:1.55}\n.pap__sector em{letter-spacing:.04em;color:var(--violeta-claro);opacity:.85;font-size:.71875rem;font-style:normal}\n@media (min-width:821px){.pap{border:1px solid var(--linea);border-radius:calc(26px * var(--r-factor,1));background:var(--fondo-1);max-width:620px;margin:20px auto 0;overflow:hidden}.pap--sola{min-height:0}.pap__barra{padding:22px 26px 12px}.pap__titulo{font-size:1.25rem}.pap__avance{margin:8px 26px 0}.pap__migas{padding:18px 26px 0}.pap__cuerpo{padding:26px 26px 8px}.pap__cal{gap:8px}.pap__celda{aspect-ratio:1.3;border-radius:calc(16px * var(--r-factor,1));background:var(--fondo-2);font-size:1rem}.pap__celda.es-bloqueada{background:0 0}.pap__celda.es-elegida{background:var(--violeta)}.pap__mesNombre{font-size:1.125rem}.pap__hora,.pap__sector,.pap__campo,.pap__ficha{background:var(--fondo-2)}.pap__horas{grid-template-columns:repeat(5,1fr);gap:10px}.pap__hora{padding:17px 0;font-size:1rem}.pap__sector{padding:17px 18px}.pap__sector b{font-size:1rem}.pap__sector small{font-size:.8125rem}.pap__form{grid-template-columns:1fr 1fr;gap:16px}.pap__form>.pap__trago,.pap__form>.pap__marco:last-child{grid-column:1/-1}.pap__numero{font-size:4.25rem}.pap__ficha{padding:14px}.pap__fichaFoto{width:84px;height:84px}.pap--sola .pap__pie{position:static}.pap__pie{background:0 0;padding:8px 26px 26px}.pap__seguir{max-width:320px;margin:0 auto;display:block}}\n.pap__avatar{background:radial-gradient(circle at 50% 38%, rgb(var(--violeta-rgb) / .16), transparent 72%);border-color:rgb(var(--violeta-rgb) / .22);width:68px;height:68px;box-shadow:none}\n.pap__lateral{display:none}\n.pap__paso{min-width:0}\n@media (min-width:821px){.pap{max-width:none}.pap__cuerpo{grid-template-columns:minmax(0,1fr) 236px;align-items:start;gap:26px;display:grid}.pap__lateral{border:1px solid var(--linea);border-radius:calc(18px * var(--r-factor,1));background:var(--fondo-2);order:2;grid-template-columns:minmax(0,1fr);align-content:start;gap:14px;padding:16px;display:grid}.pap__lateral .pap__ficha{background:0 0;border:0;grid-template-columns:minmax(0,1fr);gap:10px;padding:0;display:grid}.pap__lateral .pap__fichaFoto{border-radius:calc(14px * var(--r-factor,1));width:100%;height:116px}.pap__lateral .pap__fichaTexto,.pap__lateral .pap__resumen,.pap__lateral .pap__lateralTitulo{overflow-wrap:anywhere}.pap__lateral .pap__resumen{border-top:1px solid var(--linea);margin:0}.pap__lateral .pap__resumen>div{padding:10px 0}.pap__lateral .pap__resumen dd{font-size:.875rem}.pap__lateralNota{color:var(--texto-3);margin:0;font-size:.71875rem;line-height:1.6}.pap__soloChico{display:none}.pap__form{grid-template-columns:1fr}.pap__celda{aspect-ratio:1.15}.pap__horas{grid-template-columns:repeat(3,1fr)}.pap__pie{padding:8px 26px 26px}.pap__seguir{max-width:none;margin:0}.pap{container:pap/inline-size}}\n@container pap (max-width:600px){.pap__cuerpo{display:block}.pap__lateral{display:none}.pap__soloChico{display:flex}}\n@media (min-width:821px){.pap__gente{padding:14px 0 6px}}\n.pap__cuenta{color:var(--texto-2)}\n@media (min-width:821px){.pap__lateral{background:rgb(var(--violeta-rgb) / .07);border-color:rgb(var(--violeta-rgb) / .22)}.pap__lateral .pap__fichaTexto b{color:var(--texto)}.pap__lateral .pap__fichaTexto{gap:0}.pap__lateral .pap__fichaTexto small{color:var(--texto-2);opacity:1;line-height:1.45}.pap__lateral .pap__fichaTexto b{margin-bottom:3px}.pap__lateral .pap__resumen{border-top-color:rgb(var(--violeta-rgb) / .2)}.pap__lateral .pap__resumen>div{border-bottom-color:rgb(var(--violeta-rgb) / .2)}.pap__lateral .pap__resumen dt{color:var(--violeta-claro);font-weight:700}.pap__lateral .pap__resumen dd{color:var(--texto)}.pap__lateralPie{text-align:center;padding-top:2px}.pap__lateralTitulo{letter-spacing:-.01em;color:var(--texto);margin:0 0 4px;font-size:.8125rem;font-weight:600}.pap__lateralNota{color:var(--texto-3);margin:0;font-size:.71875rem;line-height:1.55}}\n.pap__titulo{font-size:1.1875rem}\n@media (min-width:821px){.pap__titulo{letter-spacing:-.03em;font-size:1.4375rem}.pap__lateralTitulo{text-align:center;text-wrap:balance;letter-spacing:-.02em;margin:0;font-size:.71875rem}}\n.pap__ayuda,.noche__dia small,.noche__dato small{color:var(--texto-2)}\n.pap__cuenta{letter-spacing:.2em;margin-top:1px;font-size:.6875rem}\n.pap__grupo{gap:14px;margin-top:18px;display:grid}\n.pap__avatar{width:76px;height:76px}\n.pap__avatar svg{width:32px;height:32px}\n@media (min-width:821px){.pap__avatar{width:84px;height:84px}.pap__avatar svg{width:36px;height:36px}}\n.ofrece{gap:26px}\n.ofrece__grupo{gap:9px}\n.wspCta{border-radius:var(--r-md,12px);place-self:center;width:auto;padding:10px 20px;display:inline-flex}\n.wspCta__cuerpo{gap:8px;font-size:.90625rem}\n.wspCta__cuerpo svg{width:18px;height:18px}\n.tarjeta:has(>.wspCta){text-align:center}\n.idsel{z-index:60;align-items:center;gap:8px;display:flex;position:fixed;top:18px;right:20px}\n@media (min-width:1241px){.idsel--cabecera{position:absolute;top:-4px;right:0}}\n.idsel__boton{border:1px solid var(--linea);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);color:var(--texto);cursor:pointer;background:color-mix(in srgb, var(--fondo-0) 82%, transparent);border-radius:999px;align-items:center;gap:9px;padding:9px 13px;font-family:inherit;font-size:.8125rem;font-weight:500;transition:border-color .18s,transform .18s;display:flex}\n.idsel__boton:hover{border-color:var(--violeta);transform:translateY(-1px)}\n.idsel__boton img,.idsel__op img{object-fit:cover;border-radius:2px;width:22px;height:16px;display:block;box-shadow:inset 0 0 0 1px #ffffff24}\n.idsel__flecha{color:var(--texto-3)}\n.idsel__lista{border:1px solid var(--linea);background:var(--fondo-2);border-radius:calc(16px * var(--r-factor,1));min-width:192px;padding:8px;position:absolute;top:calc(100% + 8px);right:0;box-shadow:0 24px 60px #0009}\n.idsel__op{width:100%;color:var(--texto);text-align:left;cursor:pointer;border-radius:calc(11px * var(--r-factor,1));background:0 0;border:0;align-items:center;gap:11px;padding:10px;font-family:inherit;font-size:.875rem;display:flex}\n.idsel__op:hover{background:#ffffff0f}\n.idsel__op.es-elegido{background:#814dfa29}\n.idsel__punto{background:var(--violeta);border-radius:50%;width:6px;height:6px;margin-left:auto}\n@media (max-width:700px){.idsel{top:22px;right:14px}.idsel__boton{gap:6px;padding:8px 10px}.idsel__nombre{display:none}}\n.opin{border:1px solid var(--linea);border-radius:var(--r-lg);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);background:rgb(var(--vidrio-rgb,20 22 31) / .72);padding:16px 16px 14px;position:relative}\n.opin__rotulo{letter-spacing:.16em;text-transform:uppercase;color:var(--texto-3);margin:0 0 13px;font-size:.625rem;font-weight:600}\n.opin__ficha{animation:.42s both opinEntra}\n.opin__quien{align-items:center;gap:10px;display:flex}\n.opin__cara{object-fit:cover;border-radius:50%;flex:none;width:44px;height:44px;box-shadow:inset 0 0 0 1px #ffffff1f}\n.opin__cara--letra{background:var(--acento);color:#fff}\n.opin__cara img,img.opin__cara{object-fit:cover}\n.opin__datos{gap:1px;min-width:0;display:grid}\n.opin__datos b{letter-spacing:-.01em;white-space:nowrap;text-overflow:ellipsis;font-size:.875rem;font-weight:600;overflow:hidden}\n.opin__datos small{color:var(--texto-3);font-size:.6875rem}\n.opin__g{opacity:.9;flex:none;margin-left:auto}\n.opin__puntaje{align-items:center;gap:9px;margin:11px 0 9px;display:flex}\n.opin__puntaje span{color:var(--texto-3);font-size:.71875rem}\n.opin__texto{color:var(--texto-2);-webkit-line-clamp:6;overflow-wrap:anywhere;-webkit-box-orient:vertical;margin:0;font-size:.8125rem;line-height:1.62;display:-webkit-box;overflow:hidden}\n.opin__texto.es-abierta{overscroll-behavior:contain;scrollbar-width:thin;max-height:44vh;display:block;overflow-y:auto}\n.opin__mas{color:var(--violeta-claro,#a98bff);cursor:pointer;background:0 0;border:0;margin-top:7px;padding:0;font-family:inherit;font-size:.71875rem;font-weight:500}\n.opin__mas:hover{text-decoration:underline}\n.opin__fotos{scrollbar-width:none;gap:6px;margin-top:12px;padding-bottom:2px;display:flex;overflow-x:auto}\n.opin__fotos::-webkit-scrollbar{display:none}\n.opin__foto{border:1px solid var(--linea);cursor:pointer;border-radius:calc(10px * var(--r-factor,1));background:0 0;flex:none;width:58px;height:58px;padding:0;transition:border-color .18s,transform .18s;overflow:hidden}\n.opin__foto img{object-fit:cover;width:100%;height:100%;display:block}\n.opin__foto:hover{border-color:var(--violeta);transform:translateY(-2px)}\n.opin__pie{align-items:center;gap:8px;margin-top:14px;display:flex}\n.opin__paso{border:1px solid var(--linea);width:26px;height:26px;color:var(--texto-2);cursor:pointer;background:0 0;border-radius:50%;flex:none;padding:0;font-size:.9375rem;line-height:1;transition:border-color .18s,color .18s}\n.opin__paso:hover{border-color:var(--violeta);color:var(--texto)}\n.opin__puntos{flex:1;justify-content:center;gap:6px;display:flex}\n.opin__punto{background:var(--linea-viva,#3a3330);cursor:pointer;border:0;border-radius:50%;width:6px;height:6px;padding:0;transition:background .2s,width .2s}\n.opin__punto.es-actual{background:var(--violeta);border-radius:3px;width:18px}\n.opin__fuente{border-top:1px solid var(--linea);color:var(--texto-3);margin-top:12px;padding-top:12px;font-size:.6875rem;text-decoration:none;transition:color .18s;display:block}\n.opin__fuente:hover{color:var(--violeta-claro,#a98bff)}\n@media (prefers-reduced-motion:reduce){.opin__ficha{animation:none}}\n@media (max-width:940px){.opin{padding:18px 16px 15px}.opin__texto{-webkit-line-clamp:7;font-size:.84375rem}.opin__foto{width:64px;height:64px}}\n.pap__apurado{border-radius:calc(18px * var(--r-factor,1));background:#ffffff08;border:1px solid #ffffff1a;gap:10px;margin-top:16px;padding:18px;display:grid}\n.pap__apurado b{letter-spacing:-.01em;font-size:1rem;font-weight:600}\n.pap__apurado small{opacity:.72;font-size:.84375rem;font-weight:300;line-height:1.6}\n.pap__apurado .wspBoton{margin-top:4px}\n.pap__hora.es-sobreLaHora{opacity:.78}\n.pap__hora.es-sobreLaHora:after{content:\"\";vertical-align:middle;background:currentColor;border-radius:50%;width:5px;height:5px;margin-left:6px;display:inline-block}\n.pap__pocas{letter-spacing:.08em;text-transform:uppercase;color:#ffb020;vertical-align:2px;background:#ffb0201a;border:1px solid #ffb02073;border-radius:999px;margin-left:9px;padding:3px 9px;font-size:.625rem;font-weight:700;display:inline-block}\n.ubic__mapa{border-radius:var(--r-md);margin-bottom:14px;display:block;overflow:hidden}\n.ubic__mapa img{border-radius:var(--r-md);border:1px solid var(--linea);width:100%;height:auto;transition:transform .9s cubic-bezier(.22,.8,.28,1);display:block}\n@media (prefers-reduced-motion:reduce){.ubic__mapa img{transition:none}}\n.ubic__mapa:hover img{transform:scale(1.07)}\n.ubic__texto{color:var(--texto-2);margin:0 0 14px;font-size:.84375rem;line-height:1.65}\n.ubic__texto strong{color:var(--texto);font-weight:600}\n.ubic__rotulo{letter-spacing:.14em;text-transform:uppercase;color:var(--violeta-claro);margin:0 0 2px;font-size:.65625rem;font-weight:600}\n.ubic__calle{color:var(--texto);margin:0;font-size:.9375rem;font-weight:600;line-height:1.25}\n.ubic__entre{color:var(--texto-2);margin:0;font-size:.8125rem;font-weight:300;line-height:1.35}\n@media (min-width:941px){.panel{width:256px;margin:0;position:fixed;top:16px;left:16px}.bb-izq{z-index:5;width:256px;position:fixed;top:16px;left:16px}.bb-izq .panel{width:100%;max-height:calc(100vh - 96px);margin:0;position:static;top:auto;left:auto}.bb-izq .wspCta--panel{border-radius:calc(12px * var(--r-factor,1));justify-content:center;align-items:center;gap:10px;width:100%;margin:8px 0 0;padding:14px 18px;font-size:.90625rem;font-weight:600;display:flex}.costado>.wspCta{display:none}.centro{grid-column:2}.costado{grid-column:3}}\n@media (min-width:941px) and (max-width:1240px){.costado{grid-column:2}}\n@media (min-width:1241px){.tapa{position:relative}}\n.noche__dia strong:first-letter,.pap__mesNombre:first-letter{text-transform:uppercase}\n.encu__estrellas{gap:2px;display:inline-flex}\n:root[data-local=bradley] .fondoFotos{opacity:.07}\n:root[data-local=esperanto] .sobre__cierre{color:#fff;text-transform:uppercase;letter-spacing:.03em;background:linear-gradient(100deg,#fff 47%,#ff2f43 50%,#fff 53%) 0 0/250% 100%;-webkit-text-fill-color:transparent;-webkit-background-clip:text;background-clip:text;font-weight:700;animation:12s ease-in-out infinite alternate brilloRojo}\n@media (prefers-reduced-motion:reduce){:root[data-local=esperanto] .sobre__cierre{-webkit-text-fill-color:#fff;color:#fff;background:0 0;animation:none}}\n:root[data-tema=light][data-local=esperanto] .sobre__cierre{background-image:linear-gradient(100deg, var(--texto) 47%, #ff2f43 50%, var(--texto) 53%)}\n@media (prefers-reduced-motion:reduce){:root[data-tema=light][data-local=esperanto] .sobre__cierre{-webkit-text-fill-color:var(--texto);color:var(--texto);background:0 0}}\n.pie__mise{color:inherit;text-decoration:none}\n.pie__mise strong{transition:color .15s}\n.pie__mise:hover strong{color:var(--acento)}\n.pap__campo[type=date]{appearance:none;text-align:left;min-width:0;max-width:100%}\n.pap__campo[type=date]::-webkit-date-and-time-value{text-align:left;margin:0}\n.pap__campo[type=date]::-webkit-calendar-picker-indicator{opacity:.5;cursor:pointer;margin-left:auto}\n.pap__campo[type=date]::-webkit-datetime-edit{padding:0}\n.especiales__walkin{margin-top:14px}\n.especiales__noches{grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin:18px 0 0;padding:0;list-style:none;display:grid}\n.especiales__noche{border:1px solid color-mix(in srgb, var(--violeta) 26%, transparent);background:linear-gradient(160deg, color-mix(in srgb, var(--violeta) 12%, transparent), color-mix(in srgb, var(--violeta) 3%, transparent));border-radius:14px;gap:2px;padding:14px 16px 13px;display:grid}\n.especiales__noche-dia{font-family:var(--fuente-titular,inherit);letter-spacing:-.02em;color:var(--texto);font-size:1.75rem;font-weight:800;line-height:1.05}\n.especiales__noche-hasta{font-family:var(--fuente-mono,inherit);letter-spacing:.16em;text-transform:uppercase;color:var(--texto-3,var(--texto));opacity:.8;font-size:.6875rem;font-weight:500}\n.especiales__noche-hora{font-family:var(--fuente-titular,inherit);letter-spacing:-.01em;color:var(--violeta-claro,var(--violeta));font-variant-numeric:tabular-nums;font-size:1.125rem;font-weight:700;line-height:1.1}\n.especiales__texto{margin-top:12px}\n.ofrece .reels:before,.ofrece__grupo.sobre:before,.especiales.general>.ofrece:after{content:\"\";border-top:1px solid #0000;border-image:linear-gradient(90deg, transparent, rgb(var(--violeta-rgb) / .18) 22%, rgb(var(--violeta-rgb) / .18) 78%, transparent) 1;height:0;display:block}\n.ofrece>.ofrece__grupo:has(.sobre)+.ofrece__grupo:before{content:\"\";border-top:1px solid #0000;border-image:linear-gradient(90deg, transparent, rgb(var(--violeta-rgb) / .18) 22%, rgb(var(--violeta-rgb) / .18) 78%, transparent) 1;height:0;display:block}\n.ofrece .reels{margin-top:31px}\n.ofrece .reels:before{margin-bottom:40px}\n.ofrece__grupo.sobre{margin-top:30px}\n.ofrece__grupo.sobre:before{margin-bottom:31px}\n.ofrece>.ofrece__grupo:has(.sobre)+.ofrece__grupo:before{margin:14px 0 31px}\n.especiales.general>.ofrece:after{margin:14px 0 22px}\n.pag.es-foco{grid-template-columns:minmax(0,1fr)}\n.pag.es-foco .centro{grid-column:1/-1;max-width:760px}\n.pag.es-foco .costado,.pag.es-foco .especiales,.pag.es-foco .bb-izq,.pag.es-foco .flotar{display:none!important}\n.pag.es-foco .foco__salida{justify-content:center;margin:20px 0 0;display:flex}\n.pag.es-foco .foco__salida--menos{display:none}\n.pag.es-revela .foco__salida--menos{justify-content:center;margin:14px 0 0;display:flex}\n.fechasArriba .especiales__botones{margin-bottom:0}\n.pag.es-foco .fechasArriba+.foco__salida{margin-top:34px}\n.pap__cierres{gap:6px;margin:12px 0 0;padding:0;list-style:none;display:grid}\n.pap__cierres li{color:var(--texto-2);border-left:2px solid var(--acento,currentColor);padding-left:12px;font-size:.8125rem;line-height:1.5}\na.pap__celda{-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none;text-decoration:none}\na.pap__celda:focus-visible{outline:2px solid var(--violeta);outline-offset:2px}\n.pap__mesBoton:disabled{opacity:.28;cursor:default}\n@media (max-width:820px){.pap__pie.es-pegado{z-index:3;margin-top:0;position:sticky;bottom:0}:is(body:has(.medicion) .pap__pie.es-pegado,body:has(.medicion) .pap--sola .pap__pie){bottom:74px}.pap__campo{scroll-margin:84px 0 150px}.pap{scroll-margin-top:66px}}\n.pap__error--campo,.pap__marco>.pap__error--campo{color:var(--rojo);margin:2px 0 0;font-size:.78125rem;font-weight:500;line-height:1.45;display:block}\n.pap__campo[aria-invalid=true]{border-color:var(--rojo)}\n.pap__pie>.pap__error--pie{text-align:center;margin:10px 0 0;line-height:1.45}\n:root .pag .fondoFotos.es-espera{opacity:0}\n.pap__sugerencia,.pap__marco>.pap__sugerencia{color:var(--texto-2);letter-spacing:0;text-transform:none;flex-wrap:wrap;align-items:center;gap:4px 10px;margin:6px 0 0;font-size:.8125rem;font-weight:400;line-height:1.45;display:flex}\n.pap__sugerencia b{color:var(--texto);word-break:break-all;font-weight:600}\n.pap__sugerencia-boton{border:1px solid var(--linea-viva);border-radius:calc(8px * var(--r-factor,1));color:var(--texto);font:inherit;cursor:pointer;background:0 0;padding:4px 10px;font-weight:600}\n.pap__sugerencia-boton:hover{border-color:var(--texto-3)}\n.pap__sugerencia-boton:focus-visible{outline:2px solid var(--violeta-claro);outline-offset:2px}\n.pap__sugerencia-botones{flex-wrap:wrap;gap:6px;display:inline-flex}\n.pap__sugerencia.es-fuerte,.pap__marco>.pap__sugerencia.es-fuerte{border:1px solid color-mix(in srgb, var(--violeta-claro) 55%, transparent);border-radius:calc(10px * var(--r-factor,1));background:color-mix(in srgb, var(--violeta-claro) 9%, transparent);color:var(--texto);gap:8px 12px;margin-top:8px;padding:10px 12px;font-size:.875rem}\n.pap__sugerencia.es-fuerte .pap__sugerencia-boton.es-si{background:var(--violeta-claro);border-color:var(--violeta-claro);color:#fff}\n.ent__cuantas .pap__contador{margin:6px 0 4px}\n.pap__resumen .ent__resumenShow dd{color:var(--violeta-claro);font-size:1.0625rem;font-weight:800}\n:root[data-plantilla] .especiales.general>.ofrece:last-child:after{display:none}\n:root[data-plantilla] .pap__cal{grid-template-columns:repeat(7,minmax(0,1fr))}\n:root[data-plantilla] .pap__celda{min-width:0;padding:0}\n.pap__ficha--sinFoto{display:block}\n.opin__cara--letra{color:#fff;width:44px;height:44px;font-family:var(--f-marca), var(--fuente);border-radius:50%;place-items:center;font-size:1.1875rem;font-weight:700;line-height:1;display:grid}\n.pap__miga--boton{border:1px solid var(--linea-viva);border-radius:var(--r-sm);background:var(--fondo-2);color:var(--texto-2);font:inherit;letter-spacing:.09em;text-transform:uppercase;cursor:pointer;min-height:31px;padding:0 11px;font-size:.65625rem;font-weight:700;transition:color .18s,border-color .18s,background .18s}\n.pap__miga--boton:hover{color:var(--texto);border-color:var(--violeta);background:var(--acento-tenue)}\n.bb-form .pap__marco{gap:5px}\n.bb-form .pap__campo{border-radius:calc(12px * var(--r-factor,1));padding:10px 14px}\n.bb-form .pap__form{gap:12px}\n.bb-form .pap__pie{background:0 0;padding-left:0;padding-right:0}\n.pap__cal.es-cargando{opacity:.55;pointer-events:none;transition:opacity .15s}\n.reco__fuerte{color:var(--violeta-claro);font-weight:600}\n@media (min-width:941px){.especiales--mi{flex-direction:column;display:flex}.especiales--mi>.serv{order:1}.especiales--mi>.sobremi{order:2;margin-top:38px}}\n:root[data-tema=light] .prob__calco{opacity:1}\n.wspCta--panel{display:none}\n.wspCta--movil{margin:4px 20px 8px}\n.reco--texto{padding-top:2px}\n.reco--texto+.reco--texto{border-top:1px solid var(--linea);margin-top:18px;padding-top:18px}\n.logo-tema--clr,:root[data-tema=light] .logo-tema--osc{display:none!important}\n:root[data-tema=light] .logo-tema--clr{display:block!important}\n:root[data-tema=light] .tinta{border-color:var(--linea)}\n:root[data-tema=light] .tinta:hover{border-color:var(--linea-viva)}\n:root[data-tema=light] .medida{border-color:var(--linea);color:var(--texto-2)}\n:root[data-tema=light] .medida:hover{border-color:var(--linea-viva);color:var(--texto)}\n:root[data-tema=light] .medida.es-activa{color:var(--texto);border-color:var(--violeta);background:rgb(var(--acento-rgb) / .14)}\n:root[data-tema=light] .ar__boton,:root[data-tema=light] .ar__boton--fuerte{color:var(--texto)}\n:root[data-tema=light] .ar__boton:hover,:root[data-tema=light] .ar__boton--fuerte:hover{color:var(--violeta)}\n:root[data-tema=light] .bb-servicio.es-elegido{background:rgb(var(--violeta-rgb) / .1);border-color:var(--violeta)}\n:root[data-tema=light] .bb-servicio.es-elegido .bb-servicio__nombre,:root[data-tema=light] .bb-servicio.es-elegido .bb-servicio__texto,:root[data-tema=light] .bb-servicio.es-elegido .bb-servicio__rato{color:var(--texto-2)}\n:root[data-tema=light] .bb-servicio.es-elegido .bb-servicio__nombre{color:var(--texto)}\n:root[data-tema=light] .serv__item{background:var(--fondo-1)}\n:root[data-tema=light] .tapa__titulo span,:root[data-tema=light] .pie__marca{color:var(--texto)}\n.acceso--secreto{width:100%;font:inherit;text-align:left;cursor:pointer;appearance:none;font-size:.84375rem;font-weight:500;overflow:hidden}\n.acceso--secreto:after{content:\"\";pointer-events:none;background:linear-gradient(100deg, transparent 38%, rgb(var(--acento-rgb) / .16) 50%, transparent 62%);position:absolute;inset:0;transform:translate(-110%)}\n.acceso--secreto.es-abierto:after{animation:1.15s cubic-bezier(.22,.61,.36,1) .1s secretoBarrido}\n.acceso--secreto{align-items:center}\n.acceso--secreto.es-abierto{border-color:rgb(var(--acento-rgb) / .42)}\n.acceso--secreto.es-abierto .secreto__ojo{opacity:1}\n@media (prefers-reduced-motion:reduce){.secreto__pin,.secreto__ojo,.secreto__letra{transition:none}.acceso--secreto.es-abierto:after,.es-abierto .secreto__tri,.es-abierto .secreto__parpado,.es-abierto .secreto__pupila{animation:none}.secreto__tri,.secreto__parpado{stroke-dashoffset:0}.es-abierto .secreto__pupila{transform:scale(1)}}\n.ubic__mapa--quieto{cursor:default}\n.ubic__mapa--quieto:hover img{transform:none}\n.ubic__mapa--vivo{aspect-ratio:827/620;border:1px solid var(--linea);isolation:isolate;background:#e8eaed;position:relative}\n.ubic__mapa--vivo iframe{pointer-events:none;border:0;width:calc(100% + 680px);height:calc(100% + 340px);transition:transform .9s cubic-bezier(.22,.8,.28,1);position:absolute;top:-170px;left:-340px}\n.ubic__mapa--vivo:hover iframe{transform:scale(1.07)}\n@media (prefers-reduced-motion:reduce){.ubic__mapa--vivo iframe{transition:none}}\n@media (min-width:941px) and (max-width:1240px){:is(.pag:has(.bb-reels) .costado,.pag:has(.bb-casos) .costado){grid-row:99}}\n:root[data-tema=light] .bb-quien__elegir{color:color-mix(in srgb, var(--violeta) 72%, #000)}\n@media (min-width:821px){.pap__cuerpo:has(.bb-quien--lateral){grid-template-rows:auto 1fr}.pap__cuerpo:has(.bb-quien--lateral) .pap__paso{grid-row:1/span 2}.bb-quien--lateral{border:1px solid rgb(var(--violeta-rgb) / .22);border-radius:calc(18px * var(--r-factor,1));background:rgb(var(--violeta-rgb) / .07);overflow-wrap:anywhere;order:3;grid-area:2/2;grid-template-columns:minmax(0,1fr);align-content:start;gap:14px;margin-top:-10px;padding:16px;display:grid}.bb-quien--lateral .bb-quien__filas{border-top-color:rgb(var(--violeta-rgb) / .2)}.bb-quien--lateral .bb-quien__fila{border-bottom-color:rgb(var(--violeta-rgb) / .2)}.bb-quien--lateral .bb-quien__cabeza{position:relative}.bb-quien--lateral .bb-quien__hace{font-size:.8125rem}.bb-quien--lateral .bb-quien__cabeza .bb-quien__flecha{align-items:center;font-size:.9375rem;display:flex;position:absolute;top:0;bottom:0;right:-11px}}\n@media (hover:hover){.bb-quien__cabeza:hover .bb-quien__flecha,.bb-quien__tapa:hover .bb-quien__flecha{color:var(--violeta-claro)}.bb-quien--paso:hover{border-color:var(--linea-viva)}.bb-quien__elegir:hover,:root[data-tema=light] .bb-quien__elegir:hover{color:var(--texto);-webkit-text-decoration-color:var(--violeta-claro);text-decoration-color:var(--violeta-claro)}}\n:root[data-tema=light] .serv__tapa{background:var(--fondo-1)}\n:root[data-tema=light] .bb-arma__var.es-elegida,:root[data-tema=light] .bb-arma__extra.es-marcado,:root[data-tema=light] .bb-grupo.tiene-elegido .bb-grupo__tapa{background:rgb(var(--violeta-rgb) / .1)}\n:root[data-tema=light] .caso__marco{box-shadow:inset 0 1px #fff9,0 30px 56px -36px #00000059}\n.espejo+.especiales--mi:before,.sobremi:before,.bb-reels-cab:before,.bb-casos:before,.bb-galeria:before{content:\"\";border-top:1px solid #0000;border-image:linear-gradient(90deg, transparent, rgb(var(--violeta-rgb) / .18) 22%, rgb(var(--violeta-rgb) / .18) 78%, transparent) 1;height:0;margin-bottom:40px;display:block}\n@media (max-width:940px){.especiales--mi>.sobremi:after{content:\"\";border-top:1px solid #0000;border-image:linear-gradient(90deg, transparent, rgb(var(--violeta-rgb) / .18) 22%, rgb(var(--violeta-rgb) / .18) 78%, transparent) 1;height:0;margin-top:40px;display:block}}\n.bb-op__estrellas{flex:none;line-height:0}\n.bb-op__estrellas svg{width:68px;height:auto}\n:root[data-tema=light] .bb-op__punto{color:rgb(var(--violeta-rgb) / .5)}\nbody.con-resena .flotar{opacity:0;pointer-events:none;transform:translateY(8px)}\n.cabina .barra .tematog{border:1px solid var(--linea);width:40px;height:40px;color:var(--humo);background:0 0;border-radius:4px;transition:color .2s,border-color .2s,transform .2s;position:static}\n.cabina .barra .tematog:hover{color:var(--hueso);border-color:var(--borde);transform:translateY(-1px)}\n.cabina .barra .tematog{cursor:pointer}\n.cabina .tematog__luna{display:none}\n.cabina .barra .tematog:focus-visible{outline:2px solid var(--violeta-claro);outline-offset:3px;border-radius:4px}\n:root[data-tema=light] .cabina .evento{box-shadow:var(--sombra,none)}\n:root[data-tema=light] .cabina .evento__escena:before{background:radial-gradient(closest-side at 50% 66%,#16121a0d,#0000)}\n:root[data-tema=light] .cabina .evento__sombra{background:radial-gradient(closest-side,#16121a6b,#0000)}\n.cabina .estrellas{color:var(--violeta-claro);letter-spacing:3px;font-size:13px}\n.cabina .estrellas__off{color:var(--humo);opacity:.35}\n.cabina .pie{text-align:center;margin-top:40px;padding:22px 40px 46px}\n.cabina .pie__marca{letter-spacing:.16em;text-transform:uppercase;color:var(--texto-2);margin:0;font-size:.6875rem;font-weight:500}\n.cabina .pie__marca strong{color:var(--texto);letter-spacing:.22em;font-weight:700}\n.cabina .pie__punto{opacity:.6;margin:0 9px}\n.cabina .pie__mise{color:inherit;text-decoration:none}\n.cabina .pie__mise strong{transition:color .15s}\n.cabina .pie__mise:hover strong{color:var(--acento)}\n@media (max-width:860px){.cabina .barra nav{display:none}.cabina .sets,.cabina .eventos,.cabina .resenas,.cabina .pasos,.cabina .quien{grid-template-columns:1fr}.cabina .quien{gap:26px}.cabina .vivo{grid-template-columns:1fr 1fr;gap:12px}.cabina .vivo.es-uno{grid-template-columns:minmax(0,300px)}.cabina .video{aspect-ratio:3/4}.cabina .fotos{grid-template-rows:none;grid-template-columns:1fr 1fr}.cabina .foto--grande{aspect-ratio:16/10;grid-area:auto/1/auto/-1}.cabina .foto figcaption b{font-size:13.5px}.cabina .fechas li{grid-template-columns:1fr auto;gap:4px 12px}.cabina .fechas .zona{grid-column:1}.cabina .fechas a{grid-area:1/2/span 3}.cabina .portada{padding-top:20px}.cabina .portada__grilla{grid-template-columns:1fr;gap:18px}.cabina .portada__logo{width:140px}.cabina .portada__disco{order:-1}.cabina .portada .redes{margin-top:0}.cabina .portada .redes+.portada__nombre{margin-top:20px}.cabina .portada__nombre{font-size:12.4vw}.cabina .portada__linea{margin-top:18px}.cabina .portada__acc{margin-top:24px}.cabina .portada__acc .bt{flex:100%}.cabina .barra .bt,.cabina .barra__marca{min-height:44px}.cabina .barra .tematog{width:44px;height:44px}.cabina .barra__acc{gap:8px}.cabina .tabs button,.cabina .fechas .entradas{min-height:44px}.cabina .pie__mise{margin:-14px -8px;padding:14px 8px;display:inline-block}.cabina .mini__info{flex:1;width:auto}.cabina .mini .onda,.cabina .foto:not(.foto--grande) figcaption,.cabina .foto:not(.foto--grande):after{display:none}.cabina .tira__pista{overscroll-behavior-x:contain;scroll-snap-type:x mandatory;scrollbar-width:none;gap:12px;margin:30px -20px 0;padding:4px 20px;scroll-padding-inline:20px;display:flex;overflow-x:auto}.cabina .tira__pista::-webkit-scrollbar{display:none}.cabina .tira__pista>*{scroll-snap-align:start;flex:0 0 calc(100% - 36px);min-width:0}.cabina .tira__pista:focus-visible{outline:2px solid var(--violeta-claro);outline-offset:-2px}.cabina .tira__pista .evento .bt{white-space:normal;text-align:center;min-height:52px;padding-block:8px;line-height:1.2}.cabina .tira__ctrl{justify-content:space-between;align-items:center;gap:12px;margin-top:12px;display:flex}.cabina .tira__cuenta{font-variant-numeric:tabular-nums;margin:0}.cabina .tira__cuenta b{color:var(--violeta-claro);font-weight:500}.cabina .tira__flechas{gap:8px;display:flex}.cabina .tira__bt{border:1px solid var(--borde);width:44px;height:44px;color:var(--hueso);cursor:pointer;background:0 0;border-radius:4px;place-items:center;padding:0;transition:border-color .2s,opacity .2s,transform .2s;display:grid}@media (hover:hover){.cabina .tira__bt:hover:not(:disabled){border-color:var(--hueso)}}.cabina .tira__bt:active:not(:disabled){transform:scale(.95)}.cabina .tira__bt:disabled{opacity:.3;cursor:default}.cabina .tira__bt:focus-visible{outline:2px solid var(--violeta-claro);outline-offset:3px;border-radius:4px}}\n@media (max-width:560px){.cabina .pie{padding:22px 14px 40px}.cabina .pie__ciudad{display:none}.cabina .pie__marca{white-space:nowrap;letter-spacing:.13em;font-size:.65625rem}.cabina .contratar{padding-right:14px}.cabina .barra__marca.es-conlogo .barra__nombre{display:none}.cabina .video{--corte:calc(84px + 20%);--corte-abajo:84px}.cabina .video__pie{padding:0 10px 10px}.cabina .video__lugar{letter-spacing:.08em;font-size:10px;line-height:1.35}.cabina .video__fila{gap:6px;margin-top:2px}.cabina .video__bt{min-width:34px;height:34px}.cabina .video__son{padding:0}.cabina .video__son-txt,.cabina .video__dur{display:none}.cabina .video__tiempo{letter-spacing:0;font-size:10.5px}.cabina .video__grande{width:60px;height:60px}.cabina .video__grande svg{width:18px;height:18px}.cabina .quien__datos{gap:6px}.cabina .quien__datos>div{border-radius:12px;padding:16px 9px 14px}.cabina .quien__datos strong{font-size:25px}.cabina .quien__datos span.mono{letter-spacing:.03em;font-size:11px}.cabina .quien__datos span.mono .dato__corto{display:block}.cabina .dato__largo{clip-path:inset(50%);white-space:nowrap;width:1px;height:1px;position:absolute;overflow:hidden}.cabina .foto--grande{aspect-ratio:1}}\n:root[data-tema=light] .cabina{--noche:#f6f4f1;--hueso:#16121a;--humo:#625b68;--suave:#403a46;--cabina:#fff;--apagada:color-mix(in srgb, var(--acento) 22%, #dcd6cf);--linea:#16121a1c;--borde:#16121a4d;--vidrio:#f6f4f1d6;--sombra:0 1px 2px #16121a0d, 0 16px 34px -24px #16121a4d;--acento:var(--cab-lleno-clr,#814dfa);--tinta-acento:var(--cab-tinta-clr,#fff);--violeta-claro:var(--cab-resalte-clr,#6a3ae0);--lightningcss-light:initial;--lightningcss-dark: ;color-scheme:light}\n:root[data-tema=light] .cabina :is(.video,.foto,.logo){--hueso:#f4f0ea;--humo:#8c8494;--suave:#cfc8d6;--linea:#f4f0ea1a;--cabina:#17131a;--violeta-claro:var(--cab-resalte-osc,#9b7bff);color:var(--hueso)}\n:root[data-tema=light] .cabina .cabina__fondo{opacity:.05;filter:grayscale()contrast(1.05)}\n:root[data-tema=light] .cabina .orbitas-b circle{stroke:rgb(var(--violeta-rgb) / .24)}\n:root[data-tema=light] .cabina .portada__disco:before{content:\"\";pointer-events:none;border-radius:50%;position:absolute;inset:2.5%;box-shadow:0 28px 44px -14px #16121a6b,0 4px 10px -2px #16121a2e}\n:root[data-tema=light] .cabina .logo .surco{stroke:#f4f0ea1f}\n:root[data-tema=light] .cabina :is(.set,.paso,.foto,.video){box-shadow:var(--sombra)}\n:root[data-tema=light] .cabina .video,:root[data-tema=light] .cabina .foto{border-color:#0000}\n:root[data-tema=light] .cabina .bt--borde:hover{border-color:var(--hueso)}\n:root[data-tema=light] .cabina .redes a{border-color:var(--borde);background:#fff9}\n:root[data-tema=light] .cabina .redes a:hover{border-color:var(--hueso)}\n:root[data-tema=light] .cabina .bt--lleno:hover{background:color-mix(in srgb, var(--acento) 86%, #000)}\n:root[data-tema=light] .cabina :is(.bt--lleno,.play,.cabina-hoja__bt--lleno){box-shadow:inset 0 0 0 1px var(--cab-contorno-clr,transparent)}\n:root[data-tema=light] .cabina .cabina-hoja__dia.es-sel{border-color:var(--cab-contorno-clr,var(--ch-acento))}\n:root[data-tema=light] .cabina .quien__datos>div{background:radial-gradient(130% 100% at 0% 0%, rgb(var(--violeta-rgb) / .09), transparent 58%), #fff;box-shadow:var(--sombra)}\n:root[data-tema=light] .cabina .quien__datos>div:before{background:linear-gradient(145deg, rgb(var(--violeta-rgb) / .45), #16121a14 45%, #16121a0f)}\n:root[data-tema=light] .cabina .quien__datos>div:after{background:conic-gradient(from var(--cabina-giro), transparent 0deg 250deg, rgb(var(--violeta-rgb) / .85) 305deg, var(--violeta-claro) 332deg, transparent 348deg)}\n:root[data-tema=light] .cabina .fechas .entradas{border-color:rgb(var(--violeta-rgb) / .35);background:#fff}\n:root[data-tema=light] .cabina .mini{background:color-mix(in srgb, var(--acento) 6%, #ffffffdb);border-color:#16121a1a;box-shadow:0 1px 2px #16121a0f,0 22px 44px -26px #16121a73}\n:root[data-tema=light] .cabina .contratar{box-shadow:inset 0 0 0 1px var(--cab-contorno-clr,transparent), inset 0 1px 0 #ffffff38, inset 0 -1px 0 #00000024, 0 18px 36px -24px #16121a80}\n:root[data-tema=light][data-logoblanco] .cabina :is(.barra__logo,.cabina-hoja__logo){filter:invert()brightness(.9)}\n:root[data-tema=light] .cabina .barra .tematog{border-color:var(--borde)}\n:root[data-tema=light] .cabina .tematog__sol{display:none}\n:root[data-tema=light] .cabina .tematog__luna{display:block}\n:root[data-tema=light] .cabina .barra .tematog:hover{border-color:var(--hueso)}\n:root[data-tema=light] .cabina .cabina-hoja{--ch-suave:#403a46;--ch-apagado:#aaa3ae;--ch-rojo:#b42318;--ch-borde:#16121a4d}\n:root[data-tema=light] .cabina .cabina-hoja__fondo{background:#16121a6b}\n:root[data-tema=light] .cabina .cabina-hoja__panel{box-shadow:-24px 0 60px -30px #16121a59}\n:root[data-tema=light] .cabina .cabina-hoja__entrada input::placeholder,:root[data-tema=light] .cabina .cabina-hoja__entrada textarea::placeholder{color:#8a838f}\n:root[data-tema=light] .cabina .cabina-hoja__campo option,:root[data-tema=light] .cabina .cabina-hoja .paisel__lista{background:#fff}\n\n/* --------------------------------------------------------------------------\n   Arco 3-Column Responsive Layout & Page Dressing (Mise Architecture)\n   -------------------------------------------------------------------------- */\nbody:not(:has(#__landing-blocks-root)),\n#__landing-blocks-root {\n  min-height: 100vh;\n  background-color: var(--fondo-0) !important;\n  color: var(--texto) !important;\n  font-family: var(--fuente-cuerpo, sans-serif);\n  position: relative;\n  overflow-x: hidden;\n}\n\n.pag-header-wrap {\n  position: relative;\n  width: 100%;\n}\n\n/* Desktop: 3-column layout matching https://arco.mise.ar/ (>= 1240px) */\n@media (min-width: 1240px) {\n  body:not(:has(#__landing-blocks-root)),\n  #__landing-blocks-root {\n    display: grid !important;\n    grid-template-columns: 272px minmax(0, 1fr) 380px !important;\n    max-width: 1600px !important;\n    margin: 0 auto !important;\n    padding: 16px 20px 48px !important;\n    gap: 28px !important;\n    align-items: start !important;\n  }\n\n  /* Column 1: Left Sticky Navigation Panel (.bb-izq) */\n  [data-landing-block*=\"bb-izq\"] {\n    grid-column: 1 !important;\n    grid-row: 1 / span 30 !important;\n    position: sticky !important;\n    top: 16px !important;\n    width: 256px !important;\n    z-index: 25 !important;\n  }\n\n  [data-landing-block*=\"bb-izq\"] .bb-izq {\n    position: static !important;\n    width: 100% !important;\n    top: auto !important;\n    left: auto !important;\n  }\n\n  [data-landing-block*=\"bb-izq\"] .panel {\n    position: static !important;\n    width: 100% !important;\n    margin: 0 !important;\n    top: auto !important;\n    left: auto !important;\n    max-height: calc(100vh - 96px) !important;\n  }\n\n  [data-landing-block*=\"bb-izq\"] .wspCta--panel {\n    display: flex !important;\n  }\n\n  /* Column 2: Center Main Content (.centro) */\n  [data-landing-block*=\"tapa\"],\n  [data-landing-block*=\"reservations\"],\n  [data-landing-block*=\"cumple\"],\n  [data-landing-block*=\"general\"],\n  [data-landing-block*=\"galeria\"] {\n    grid-column: 2 !important;\n    width: 100% !important;\n    max-width: 900px !important;\n    margin-inline: auto !important;\n  }\n\n  /* Column 3: Right Sticky Sidebar (.costado) */\n  [data-landing-block*=\"costado\"] {\n    grid-column: 3 !important;\n    grid-row: 1 / span 30 !important;\n    position: sticky !important;\n    top: 16px !important;\n    width: 380px !important;\n    z-index: 20 !important;\n  }\n\n  /* Footer: spans center to end */\n  [data-landing-block*=\"footer\"] {\n    grid-column: 2 / -1 !important;\n    max-width: 900px !important;\n  }\n}\n\n/* Tablet: 2-column layout (941px to 1239px) */\n@media (min-width: 941px) and (max-width: 1239px) {\n  body:not(:has(#__landing-blocks-root)),\n  #__landing-blocks-root {\n    display: grid !important;\n    grid-template-columns: 272px minmax(0, 1fr) !important;\n    max-width: 1240px !important;\n    margin: 0 auto !important;\n    padding: 16px 20px 48px !important;\n    gap: 24px !important;\n    align-items: start !important;\n  }\n\n  [data-landing-block*=\"bb-izq\"] {\n    grid-column: 1 !important;\n    grid-row: 1 / span 30 !important;\n    position: sticky !important;\n    top: 16px !important;\n    width: 256px !important;\n    z-index: 25 !important;\n  }\n\n  [data-landing-block*=\"bb-izq\"] .bb-izq {\n    position: static !important;\n    width: 100% !important;\n  }\n\n  [data-landing-block*=\"bb-izq\"] .panel {\n    position: static !important;\n    width: 100% !important;\n    margin: 0 !important;\n  }\n\n  [data-landing-block*=\"bb-izq\"] .wspCta--panel {\n    display: flex !important;\n  }\n\n  [data-landing-block*=\"tapa\"],\n  [data-landing-block*=\"reservations\"],\n  [data-landing-block*=\"cumple\"],\n  [data-landing-block*=\"general\"],\n  [data-landing-block*=\"galeria\"],\n  [data-landing-block*=\"costado\"],\n  [data-landing-block*=\"footer\"] {\n    grid-column: 2 !important;\n    width: 100% !important;\n    max-width: 900px !important;\n  }\n}\n\n/* Mobile: single column (<= 940px) with exact ordering & layout matching https://arco.mise.ar/ */\n@media (max-width: 940px) {\n  html, body {\n    overflow-x: hidden !important;\n    width: 100% !important;\n    max-width: 100vw !important;\n  }\n\n  body:not(:has(#__landing-blocks-root)),\n  #__landing-blocks-root {\n    display: flex !important;\n    flex-direction: column !important;\n    padding: 12px 12px 48px !important;\n    gap: 16px !important;\n    box-sizing: border-box !important;\n    overflow-x: hidden !important;\n    width: 100% !important;\n    max-width: 100vw !important;\n  }\n\n  /* Exact Mobile Flex Ordering matching live https://arco.mise.ar/ */\n  [data-landing-block*=\"tapa\"] { order: 1 !important; }\n  [data-landing-block*=\"reservations\"] { order: 2 !important; }\n  [data-landing-block*=\"cumple\"] { order: 3 !important; }\n  [data-landing-block*=\"general\"] { order: 4 !important; }\n  [data-landing-block*=\"galeria\"] { order: 5 !important; }\n  [data-landing-block*=\"bb-izq\"] { order: 6 !important; }\n  [data-landing-block*=\"costado\"] { order: 7 !important; }\n  [data-landing-block*=\"footer\"] { order: 8 !important; }\n\n  [data-landing-block*=\"bb-izq\"],\n  [data-landing-block*=\"tapa\"],\n  [data-landing-block*=\"reservations\"],\n  [data-landing-block*=\"cumple\"],\n  [data-landing-block*=\"general\"],\n  [data-landing-block*=\"galeria\"],\n  [data-landing-block*=\"costado\"],\n  [data-landing-block*=\"footer\"] {\n    width: 100% !important;\n    max-width: 100% !important;\n    box-sizing: border-box !important;\n  }\n\n  .centro {\n    padding: 0 !important;\n    width: 100% !important;\n    max-width: 100% !important;\n  }\n\n  [data-landing-block*=\"bb-izq\"] .bb-izq {\n    position: static !important;\n    width: 100% !important;\n  }\n\n  [data-landing-block*=\"bb-izq\"] .panel {\n    position: static !important;\n    width: 100% !important;\n    max-width: 100% !important;\n    margin: 8px 0 0 !important;\n    box-sizing: border-box !important;\n  }\n\n  .costado {\n    position: static !important;\n    width: 100% !important;\n    max-width: 100% !important;\n    margin: 8px 0 0 !important;\n    display: flex !important;\n    flex-direction: column !important;\n    gap: 16px !important;\n  }\n\n  .tarjeta, .opin {\n    width: 100% !important;\n    box-sizing: border-box !important;\n  }\n\n  .pap__campo, input, select, textarea {\n    font-size: 16px !important;\n    max-width: 100% !important;\n    box-sizing: border-box !important;\n  }\n\n  .acceso {\n    min-height: 44px !important;\n    box-sizing: border-box !important;\n  }\n\n  .pap__atras, .pap__mesBoton {\n    min-width: 44px !important;\n    min-height: 44px !important;\n  }\n\n  .pap__seguir {\n    min-height: 48px !important;\n  }\n\n  .wspCta {\n    width: 100% !important;\n    box-sizing: border-box !important;\n    justify-content: center !important;\n    text-align: center !important;\n  }\n\n  .wspCta__cuerpo {\n    justify-content: center !important;\n  }\n}\n\n@media (max-width: 580px) {\n  #__landing-blocks-root {\n    padding: 8px 8px 36px !important;\n    gap: 14px !important;\n  }\n\n  .tapa__titulo {\n    font-size: 1.85rem !important;\n  }\n\n  .pap__cal {\n    gap: 4px !important;\n  }\n\n  .pap__celda {\n    font-size: 0.88rem !important;\n  }\n\n  .pap__horas {\n    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;\n    gap: 6px !important;\n  }\n\n  .pap__hora {\n    padding: 12px 0 !important;\n    font-size: 0.88rem !important;\n  }\n\n  .pap__cumple {\n    grid-template-columns: 1fr !important;\n  }\n\n  .galeria {\n    grid-template-columns: repeat(2, 1fr) !important;\n    gap: 8px !important;\n  }\n\n  .galeria__grande {\n    grid-column: 1 / -1 !important;\n    height: 180px !important;\n  }\n\n  .especiales__botones {\n    grid-template-columns: 1fr !important;\n    gap: 10px !important;\n  }\n}\n\n/* Light Mode Enhancements */\n:root[data-tema=light] body:not(:has(#__landing-blocks-root)),\n:root[data-tema=light] #__landing-blocks-root {\n  background-color: var(--fondo-0) !important;\n  color: var(--texto) !important;\n}\n:root[data-tema=light] .res-table-section,\n:root[data-tema=light] .res-table-section * {\n  --fondo-0: #fbf9f7;\n  --fondo-1: #ffffff;\n  --fondo-2: #f3efeb;\n  --fondo-3: #e8e1db;\n  --linea: #e7e1db;\n  --linea-viva: #d4ccc4;\n  --texto: #1c1613;\n  --texto-2: #524940;\n  --texto-3: #867b71;\n}\n:root[data-tema=light] .panel,\n:root[data-tema=light] .tarjeta,\n:root[data-tema=light] .opin {\n  background: #ffffff !important;\n  border-color: var(--linea) !important;\n  box-shadow: 0 10px 30px -10px rgba(28, 22, 19, 0.08) !important;\n}\n:root[data-tema=light] .acceso:not(.es-principal) {\n  background: #ffffff !important;\n  border-color: var(--linea) !important;\n  color: var(--texto) !important;\n}\n:root[data-tema=light] .acceso:not(.es-principal):hover {\n  background: var(--fondo-2) !important;\n  border-color: var(--linea-viva) !important;\n}\n:root[data-tema=light] .botonRelieve {\n  border-color: var(--linea-viva) !important;\n  background: #ffffff !important;\n  color: var(--texto) !important;\n  box-shadow: 0 1px 2px #1c16130d, 0 10px 22px -14px #1c161347 !important;\n}\n:root[data-tema=light] .botonRelieve:hover {\n  background: #ffffff !important;\n  border-color: var(--violeta) !important;\n}\n:root[data-tema=light] .pap {\n  background: #ffffff !important;\n  border-color: var(--linea) !important;\n  box-shadow: 0 10px 30px -10px rgba(28, 22, 19, 0.08) !important;\n}\n:root[data-tema=light] .pap__titulo,\n:root[data-tema=light] .pap__mesNombre,\n:root[data-tema=light] .pap__numero {\n  color: #1c1613 !important;\n}\n:root[data-tema=light] .pap__cuenta,\n:root[data-tema=light] .pap__ayuda,\n:root[data-tema=light] .pap__rotulo,\n:root[data-tema=light] .pap__cal-weekdays span {\n  color: #867b71 !important;\n}\n:root[data-tema=light] .pap__cuerpo {\n  background: transparent !important;\n}\n:root[data-tema=light] .pap__celda {\n  background: var(--fondo-2) !important;\n  color: #1c1613 !important;\n  border-color: var(--linea) !important;\n}\n:root[data-tema=light] .pap__celda.es-bloqueada {\n  background: transparent !important;\n  color: #b8afa6 !important;\n}\n:root[data-tema=light] .pap__celda.es-elegida {\n  background: var(--violeta) !important;\n  border-color: var(--violeta) !important;\n  color: #ffffff !important;\n}\n:root[data-tema=light] .pap__celda.es-elegida .pap__punto,\n:root[data-tema=light] .pap__celda.es-elegida .res-cal-day-dot {\n  background: #ffffff !important;\n}\n:root[data-tema=light] .pap__hora,\n:root[data-tema=light] .pap__campo,\n:root[data-tema=light] .pap__ficha {\n  background: var(--fondo-2) !important;\n  color: #1c1613 !important;\n  border-color: var(--linea) !important;\n}\n:root[data-tema=light] .pap__lateral {\n  background: rgba(var(--violeta-rgb, 229, 57, 44), 0.06) !important;\n  border-color: rgba(var(--violeta-rgb, 229, 57, 44), 0.22) !important;\n}\n:root[data-tema=light] .pap__lateral .pap__fichaTexto b,\n:root[data-tema=light] .pap__lateral .pap__resumen dd {\n  color: #1c1613 !important;\n}\n:root[data-tema=light] .pap__lateral .pap__fichaTexto small,\n:root[data-tema=light] .pap__lateral .pap__lateralTitulo {\n  color: #524940 !important;\n}\n:root[data-tema=light] .pap__hora.es-elegida {\n  background: var(--violeta) !important;\n  border-color: var(--violeta) !important;\n  color: #ffffff !important;\n}\n:root[data-tema=light] .pap__pie {\n  background: #ffffff !important;\n}\n:root[data-tema=light] .pap__avance {\n  background: #e7e1db !important;\n}\n:root[data-tema=light] .pap__miga {\n  background: #f3efeb !important;\n  border-color: #e7e1db !important;\n  color: #524940 !important;\n}\n:root[data-tema=light] .pap__contador {\n  background: #f3efeb !important;\n  border-color: #e7e1db !important;\n}\n:root[data-tema=light] .pap__mas {\n  background: #ffffff !important;\n  border-color: #e7e1db !important;\n  color: #1c1613 !important;\n}\n:root[data-tema=light] .pap__sector {\n  background: #f3efeb !important;\n  border-color: #e7e1db !important;\n}\n:root[data-tema=light] .pap__sector b {\n  color: #1c1613 !important;\n}\n:root[data-tema=light] .pap__sector small {\n  color: #867b71 !important;\n}\n:root[data-tema=light] .tematog,\n:root[data-tema=light] .idsel__boton {\n  background: #ffffffd4 !important;\n  border-color: var(--linea-viva) !important;\n  color: var(--texto) !important;\n}\n:root[data-tema=light] .idsel__lista {\n  background: #ffffff !important;\n  border-color: var(--linea-viva) !important;\n  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.12) !important;\n}\n:root[data-tema=light] .idsel__op {\n  color: var(--texto) !important;\n}\n:root[data-tema=light] .idsel__op:hover {\n  background: var(--fondo-2) !important;\n}\n:root[data-tema=light] .idsel__op.es-elegido {\n  background: color-mix(in srgb, var(--violeta) 12%, transparent) !important;\n}\n:root[data-tema=light] .res-voucher-card {\n  background: #ffffff !important;\n  border-color: var(--linea) !important;\n}\n:root[data-tema=light] .res-voucher-code {\n  color: var(--violeta) !important;\n}\n:root[data-tema=light] .res-voucher-item .voucher-value {\n  color: var(--texto) !important;\n}\n:root[data-tema=light] .res-new-booking-btn {\n  border-color: var(--linea-viva) !important;\n  color: var(--texto) !important;\n}\n:root[data-tema=light] .res-new-booking-btn:hover {\n  background: var(--fondo-2) !important;\n}\n\n/* Visor Lightbox Pantalla Completa para Galería */\n.visor {\n  z-index: 9999;\n  -webkit-backdrop-filter: blur(8px);\n  backdrop-filter: blur(8px);\n  background: rgba(6, 5, 5, 0.94);\n  place-items: center;\n  padding: 24px;\n  animation: 0.18s both visorEntra;\n  display: grid;\n  position: fixed;\n  inset: 0;\n}\n@keyframes visorEntra { 0% { opacity: 0; } }\n.visor__caja {\n  max-width: min(88vw, 960px);\n  position: relative;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  box-sizing: border-box;\n}\n.visor__caja img {\n  object-fit: contain;\n  border-radius: 16px;\n  border: 1px solid var(--linea-viva);\n  width: auto;\n  max-width: 100%;\n  max-height: 78vh;\n  display: block;\n  box-shadow: 0 24px 60px rgba(0,0,0,0.85);\n}\n.visor__pie {\n  color: #ffffffd1;\n  justify-content: space-between;\n  align-items: center;\n  gap: 16px;\n  margin: 14px 2px 0;\n  font-size: 0.875rem;\n  width: 100%;\n  display: flex;\n  box-sizing: border-box;\n}\n.visor__pieTexto {\n  min-width: 0;\n  font-weight: 500;\n}\n.visor__pieNum {\n  white-space: nowrap;\n  color: #ffffffa0;\n  font-variant-numeric: tabular-nums;\n  font-weight: 600;\n  flex: none;\n}\n.visor__x, .visor__flecha {\n  background: rgba(20, 22, 31, 0.9);\n  color: #ffffff;\n  cursor: pointer;\n  border: 1px solid rgba(255, 255, 255, 0.35);\n  border-radius: 50%;\n  place-items: center;\n  transition: border-color 0.18s, background 0.18s, transform 0.18s;\n  display: grid;\n  position: absolute;\n  user-select: none;\n}\n.visor__x {\n  width: 40px;\n  height: 40px;\n  font-size: 1.1rem;\n  top: -50px;\n  right: 0;\n}\n.visor__flecha {\n  width: 48px;\n  height: 48px;\n  font-size: 1.8rem;\n  line-height: 1;\n  top: 50%;\n  transform: translateY(-50%);\n}\n.visor__flecha--izq { left: -60px; }\n.visor__flecha--der { right: -60px; }\n.visor__x:hover, .visor__flecha:hover {\n  border-color: var(--violeta);\n  background: var(--violeta);\n}\n.visor__flecha:hover {\n  transform: translateY(-50%) scale(1.08);\n}\n@media (max-width: 760px) {\n  .visor { padding: 16px 12px; }\n  .visor__caja { max-width: 96vw; }\n  .visor__caja img { max-height: 72vh; }\n  .visor__flecha--izq { left: 8px; }\n  .visor__flecha--der { right: 8px; }\n  .visor__x { top: -46px; right: 0; }\n}\n";

export const ARCO_GLOBAL_JS = `(function() {
  // -------------------------------------------------------------------------
  // 1. Google Reviews Carousel
  // -------------------------------------------------------------------------
  var reviews = [
    {
      name: "Lorena Abatino",
      meta: "2 opiniones",
      time: "hace 3 meses",
      avatar: "https://arco.mise.ar/resenas-arco/lorena-abatino.webp",
      text: "Excelente atención por parte de la bartender Agustina, fuimos por el cumple de una amiga y la pasamos excelente, los tragos unos mejores que los otros y a su vez, la gastronomía ni hablar. Muy recomendable!!!"
    },
    {
      name: "Valeria Usoli",
      meta: "Local Guide · 15 opiniones",
      time: "hace 2 meses",
      avatar: "https://arco.mise.ar/resenas-arco/valeria-usoli.webp",
      text: "El lugar tiene una onda tremenda, la música del DJ acompaña toda la noche y las papas Arco son de otro planeta. Conviene reservar antes porque se llena!"
    },
    {
      name: "Iara Ossola",
      meta: "4 opiniones",
      time: "hace 4 meses",
      avatar: "https://arco.mise.ar/resenas-arco/iara-ossola.webp",
      text: "Fuimos un viernes a la noche, el ambiente súper lindo y la barra un 10. Los chicos atienden rápido y súper amables. Los cócteles de autor son riquísimos!"
    },
    {
      name: "Ricca Florencia",
      meta: "1 opinión",
      time: "hace 1 mes",
      avatar: "https://arco.mise.ar/resenas-arco/ricca-florencia.webp",
      text: "Festejamos mi cumpleaños con la propuesta de pizza y papas libres y fue un éxito total. Todos mis amigos quedaron encantados con la comida y los tragos!"
    },
    {
      name: "Bruno Conti",
      meta: "Google Review",
      time: "hace 5 meses",
      avatar: "https://arco.mise.ar/resenas-arco/bruno-conti.webp",
      text: "Excelente opción en calle Olavarría. Buenos precios, tragos de autor de primer nivel y la atención en la barra rapidísima."
    },
    {
      name: "Lourdes Caceres",
      meta: "3 opiniones",
      time: "hace 2 meses",
      avatar: "https://arco.mise.ar/resenas-arco/lourdes-caceres.webp",
      text: "La ambientación con neones rojos es hermosa. La música acompaña sin aturdir para charlar en la previa y después explota con el DJ. ¡Volveremos seguro!"
    },
    {
      name: "Agustina Césari",
      meta: "Local Guide",
      time: "hace 3 meses",
      avatar: "https://arco.mise.ar/resenas-arco/agustina-cesari.webp",
      text: "Me encantó el deck exterior para tomar algo al atardecer en el happy hour. Las hamburguesas son espectaculares y la cerveza tirada bien fría."
    }
  ];

  var currentReviewIdx = 0;
  function renderReview(idx) {
    var r = reviews[idx];
    if (!r) return;
    var nameEl = document.getElementById('opinAuthorName');
    var metaEl = document.getElementById('opinAuthorMeta');
    var avatarEl = document.getElementById('opinAuthorAvatar');
    var textEl = document.getElementById('opinText');
    var dateEl = document.getElementById('opinDate');

    if (nameEl) nameEl.textContent = r.name;
    if (metaEl) metaEl.textContent = r.meta;
    if (avatarEl) {
      avatarEl.src = r.avatar;
      avatarEl.alt = r.name;
    }
    if (textEl) textEl.textContent = r.text;
    if (dateEl) dateEl.textContent = r.time;

    var dots = document.querySelectorAll('#opinDots .opin__punto');
    dots.forEach(function(d, i) {
      if (i === idx) {
        d.classList.add('es-actual');
        d.setAttribute('aria-selected', 'true');
      } else {
        d.classList.remove('es-actual');
        d.setAttribute('aria-selected', 'false');
      }
    });
  }

  function initReviewsCarousel() {
    var prevBtn = document.getElementById('opinPrevBtn');
    var nextBtn = document.getElementById('opinNextBtn');
    if (prevBtn) {
      prevBtn.addEventListener('click', function(e) {
        e.preventDefault();
        currentReviewIdx = (currentReviewIdx - 1 + reviews.length) % reviews.length;
        renderReview(currentReviewIdx);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function(e) {
        e.preventDefault();
        currentReviewIdx = (currentReviewIdx + 1) % reviews.length;
        renderReview(currentReviewIdx);
      });
    }

    var dotsContainer = document.getElementById('opinDots');
    if (dotsContainer) {
      dotsContainer.addEventListener('click', function(e) {
        var dot = e.target.closest('.opin__punto');
        if (dot && dot.dataset.idx !== undefined) {
          e.preventDefault();
          currentReviewIdx = parseInt(dot.dataset.idx, 10);
          renderReview(currentReviewIdx);
        }
      });
    }
  }

  // -------------------------------------------------------------------------
  // 2. Tema Blanco & Oscuro (Light / Dark Theme)
  // -------------------------------------------------------------------------
  var SUN_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4.1"></circle><path d="M12 2.6v2.1M12 19.3v2.1M4.7 4.7l1.5 1.5M17.8 17.8l1.5 1.5M2.6 12h2.1M19.3 12h2.1M4.7 19.3l1.5-1.5M17.8 6.2l1.5-1.5"></path></svg>';
  var MOON_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 14.8A8.2 8.2 0 0 1 9.2 3.5a8.2 8.2 0 1 0 11.3 11.3z"></path></svg>';

  function updateThemeDom(theme) {
    document.documentElement.setAttribute('data-tema', theme);
    var toggles = document.querySelectorAll('.tematog');
    toggles.forEach(function(btn) {
      btn.setAttribute('aria-label', theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
      btn.setAttribute('title', theme === 'dark' ? 'Modo claro' : 'Modo oscuro');
      btn.innerHTML = (theme === 'dark') ? SUN_SVG : MOON_SVG;
    });
  }

  function initTemaToggle() {
    var savedTheme = 'dark';
    try {
      savedTheme = localStorage.getItem('mise_tema') || 'dark';
    } catch (_) {}
    updateThemeDom(savedTheme);

    document.addEventListener('click', function(e) {
      var btn = e.target.closest('.tematog');
      if (!btn) return;
      e.preventDefault();
      var currentTheme = document.documentElement.getAttribute('data-tema') || 'dark';
      var nextTheme = (currentTheme === 'dark') ? 'light' : 'dark';
      try {
        localStorage.setItem('mise_tema', nextTheme);
      } catch (_) {}
      updateThemeDom(nextTheme);
    });
  }

  // -------------------------------------------------------------------------
  // 3. Multiidioma (i18n: ES / EN / PT)
  // -------------------------------------------------------------------------
  var FLAG_AR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 480'%3E%3Cpath fill='%2375aadb' d='M0 0h640v480H0z'/%3E%3Cpath fill='%23fff' d='M0 160h640v160H0z'/%3E%3Ccircle cx='320' cy='240' r='40' fill='%23f6b40e'/%3E%3C/svg%3E";
  var FLAG_US = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 480'%3E%3Cpath fill='%23bd3d44' d='M0 0h640v480H0z'/%3E%3Cpath stroke='%23fff' stroke-width='37' d='M0 55h640M0 129h640M0 203h640M0 277h640M0 351h640M0 425h640'/%3E%3Cpath fill='%23192f5d' d='M0 0h260v222H0z'/%3E%3C/svg%3E";
  var FLAG_BR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 480'%3E%3Cpath fill='%23009b3a' d='M0 0h640v480H0z'/%3E%3Cpath fill='%23fedf00' d='M320 40l280 200-280 200L40 240z'/%3E%3Ccircle cx='320' cy='240' r='90' fill='%23002776'/%3E%3C/svg%3E";

  var LANGUAGES = {
    es: { name: 'Español', flag: FLAG_AR },
    en: { name: 'English', flag: FLAG_US },
    pt: { name: 'Português', flag: FLAG_BR }
  };

  var I18N_DICTIONARY = {
    es: {
      'nav.reservar': 'Reservar',
      'nav.carta': 'Carta',
      'nav.comoLlegar': 'Cómo llegar',
      'nav.instagram': 'Instagram',
      'nav.contactanos': 'Contactanos',
      'saber.1': 'Abrimos todos los días desde las 19:00: de domingo a jueves hasta las 02:00, viernes y sábado hasta las 04:00.',
      'saber.2': 'Happy hour de cerveza tirada de 19 a 21, todos los días.',
      'saber.3': 'Reservás a las 19, 20, 21, 22 o 23:30. Después, se entra por orden de llegada mientras haya lugar.',
      'saber.4': 'La confirmación te llega por mail al instante, con el código de tu reserva.',
      'saber.5': 'Tu mesa se confirma con una seña de $20.000 por Mercado Pago, que después se descuenta de tu cuenta.',
      'saber.6': 'Hasta 8 personas reservás acá. Si son más, escribinos y armamos tu mesa.',
      'tapa.eyebrow': 'Reservas en línea · Arco',
      'tapa.titulo': 'Reservá tu mesa ',
      'tapa.subtitulo': 'en menos de un minuto',
      'tapa.caption': 'Tragos de autor, buena música y la noche más linda de Mar del Plata.',
      'cumple.tag': 'Cumpleaños en Arco',
      'cumple.titulo': 'Festejá tu cumpleaños ',
      'cumple.subtitulo': 'con papas y pizza libre',
      'cumple.texto': 'Menú cumple $19.900 por persona: papas y pizza libre (muzza, speciale y margherita) con una consumición, con o sin alcohol. Escribinos y te armamos la mesa.',
      'cumple.btnCumple': 'Festejar mi cumpleaños',
      'cumple.btnEvento': 'Armar mi evento',
      'gen.kicker': 'Información general',
      'gen.p1': 'Un bar en la esquina de Olavarría y Rodríguez Peña, con barra de autor, cocina abierta hasta tarde y terraza.',
      'gen.p2': 'Música en vivo y DJ sets los fines de semana. Festejos de cumpleaños, salidas en grupo o una copa tranquila en la barra.',
      'opin.titulo': 'Opiniones de Google',
      'opin.ver': 'Ver más opiniones en Google',
      'costado.puntaje': 'Opiniones en Google',
      'costado.ubicacion': 'Ubicación',
      'costado.comoLlegar': 'Cómo llegar en Google Maps',
      'costado.entre': 'Entre San Lorenzo y Roca',
      'pie.texto': '<strong>ARCO</strong> · BAR &amp; COCINA · MAR DEL PLATA',
      'pap.paso1': '¿Cuándo te esperamos?',
      'pap.paso2': '¿En qué horario?',
      'pap.paso3': 'Tus datos',
      'pap.calAyuda': 'Los días con punto tienen lugar. Los apagados están cerrados o completos.',
      'pap.horariosRotulo': 'Horarios disponibles',
      'pap.dondeRotulo': '¿Dónde te ubicamos?',
      'pap.dondeNota': 'Elegí dónde querés estar: el deck afuera, el salón principal frente a la barra, o el salón fondo techado con el DJ.',
      'pap.salonB': 'Salón Principal',
      'pap.salonDesc': 'Adentro frente a la barra y cerca de la música',
      'pap.deckB': 'Deck al aire libre',
      'pap.deckDesc': 'Afuera sobre la vereda con calefacción',
      'pap.fondoB': 'Salón Fondo',
      'pap.fondoDesc': 'Al fondo, techado y cerrado, donde pasa el DJ',
      'pap.duracionMesa': '2 horas de mesa',
      'pap.comensalesRotulo': '¿Cuántas personas van?',
      'pap.comensalesAyuda': 'Hasta 14 personas se reserva desde acá.',
      'pap.nombre': 'Nombre y Apellido *',
      'pap.telefono': 'Teléfono / WhatsApp *',
      'pap.email': 'Email',
      'pap.cumple': 'Cumpleaños',
      'pap.cumpleNo': 'No festejo',
      'pap.cumpleMes': 'Cumplo este mes',
      'pap.cumpleHoy': 'Festejo hoy',
      'pap.notas': 'Comentarios o aclaraciones',
      'pap.politica': 'Tu mesa queda reservada. Te esperamos con 15 minutos de tolerancia.',
      'pap.noche': 'Noche',
      'pap.personas': 'Personas',
      'pap.hora': 'Hora',
      'pap.donde': 'Dónde',
      'pap.continuar': 'Continuar',
      'pap.confirmar': 'Confirmar reserva',
      'pap.confirmando': '⏳ Confirmando reserva de mesa...',
      'pap.voucherKicker': 'Comprobante de Reserva Confirmada',
      'pap.voucherFecha': 'Fecha',
      'pap.voucherHora': 'Turno / Horario',
      'pap.voucherComensales': 'Comensales',
      'pap.voucherEspacio': 'Espacio',
      'pap.voucherTitular': 'Titular',
      'pap.voucherWa': 'Enviar Comprobante por WhatsApp',
      'pap.voucherNuevo': 'Realizar otra reserva',
      'pap.señaAviso': 'Tu mesa, confirmada con la seña.'
    },
    en: {
      'nav.reservar': 'Book Table',
      'nav.carta': 'Menu',
      'nav.comoLlegar': 'Directions',
      'nav.instagram': 'Instagram',
      'nav.contactanos': 'Contact Us',
      'saber.1': 'Open daily from 7:00 PM: Sunday to Thursday until 2:00 AM, Friday & Saturday until 4:00 AM.',
      'saber.2': 'Draft beer happy hour from 7 to 9 PM, every day.',
      'saber.3': 'Book at 7:00, 8:00, 9:00, 10:00 or 11:30 PM. Afterward, walk-ins welcome subject to capacity.',
      'saber.4': 'Instant confirmation sent to your email with your reservation code.',
      'saber.5': 'Your table is confirmed with a deposit via Mercado Pago, credited to your final check.',
      'saber.6': 'Up to 8 guests online. For larger groups, message us and we will arrange your table.',
      'tapa.eyebrow': 'Online Bookings · Arco',
      'tapa.titulo': 'Book your table ',
      'tapa.subtitulo': 'in under a minute',
      'tapa.caption': 'Signature cocktails, great music and the finest night in Mar del Plata.',
      'cumple.tag': 'Birthdays at Arco',
      'cumple.titulo': 'Celebrate your birthday ',
      'cumple.subtitulo': 'with unlimited pizza & fries',
      'cumple.texto': 'Birthday package $19,900 per person: all-you-can-eat pizza and loaded fries with one beverage included. Message us to book your group.',
      'cumple.btnCumple': 'Celebrate my birthday',
      'cumple.btnEvento': 'Host my event',
      'gen.kicker': 'General Information',
      'gen.p1': 'A lively corner bar at Olavarría & Rodríguez Peña featuring signature craft cocktails, late-night dining and patio.',
      'gen.p2': 'Live DJs and upbeat music every weekend. Birthday parties, group nights out or a relaxed evening drink at the bar.',
      'opin.titulo': 'Google Reviews',
      'opin.ver': 'View more reviews on Google',
      'costado.puntaje': 'Google Rating',
      'costado.ubicacion': 'Location',
      'costado.comoLlegar': 'Open in Google Maps',
      'costado.entre': 'Between San Lorenzo and Roca',
      'pie.texto': '<strong>ARCO</strong> · BAR &amp; KITCHEN · MAR DEL PLATA',
      'pap.paso1': 'When are you coming?',
      'pap.paso2': 'What time?',
      'pap.paso3': 'Your details',
      'pap.calAyuda': 'Days with a dot have availability. Dimmed dates are closed or fully booked.',
      'pap.horariosRotulo': 'Available times',
      'pap.dondeRotulo': 'Where would you like to sit?',
      'pap.dondeNota': 'Choose your spot: the outdoor heated deck, the main dining area near the bar, or the back room with the DJ.',
      'pap.salonB': 'Main Bar & Dining',
      'pap.salonDesc': 'Inside facing the cocktail bar and close to the music',
      'pap.deckB': 'Open-Air Deck',
      'pap.deckDesc': 'Outside on the heated terrace',
      'pap.fondoB': 'Back Lounge',
      'pap.fondoDesc': 'At the back, covered and lively, right by the DJ booth',
      'pap.duracionMesa': '2-hour seating',
      'pap.comensalesRotulo': 'Number of guests',
      'pap.comensalesAyuda': 'Up to 14 guests online. For larger groups, contact us.',
      'pap.nombre': 'Full Name *',
      'pap.telefono': 'Phone / WhatsApp *',
      'pap.email': 'Email',
      'pap.cumple': 'Birthday',
      'pap.cumpleNo': 'No celebration',
      'pap.cumpleMes': 'Birthday this month',
      'pap.cumpleHoy': 'Celebrating today!',
      'pap.notas': 'Special requests or dietary notes',
      'pap.politica': 'Your reservation will be held for up to 15 minutes past your time slot.',
      'pap.noche': 'Date',
      'pap.personas': 'Guests',
      'pap.hora': 'Time',
      'pap.donde': 'Area',
      'pap.continuar': 'Continue',
      'pap.confirmar': 'Confirm reservation',
      'pap.confirmando': '⏳ Confirming your table...',
      'pap.voucherKicker': 'Confirmed Reservation Voucher',
      'pap.voucherFecha': 'Date',
      'pap.voucherHora': 'Time Slot',
      'pap.voucherComensales': 'Guests',
      'pap.voucherEspacio': 'Area',
      'pap.voucherTitular': 'Lead Guest',
      'pap.voucherWa': 'Send Voucher via WhatsApp',
      'pap.voucherNuevo': 'Make another reservation',
      'pap.señaAviso': 'Your table is confirmed with a deposit.'
    },
    pt: {
      'nav.reservar': 'Reservar',
      'nav.carta': 'Cardápio',
      'nav.comoLlegar': 'Como chegar',
      'nav.instagram': 'Instagram',
      'nav.contactanos': 'Fale Conosco',
      'saber.1': 'Aberto todos os dias a partir das 19h: de domingo a quinta até às 2h, sexta e sábado até às 4h.',
      'saber.2': 'Happy hour de chope das 19h às 21h, todos os dias.',
      'saber.3': 'Reserve às 19h, 20h, 21h, 22h ou 23h30. Depois, entrada por ordem de chegada conforme lotação.',
      'saber.4': 'Confirmação instantânea por e-mail com o código da sua reserva.',
      'saber.5': 'Sua mesa é confirmada com sinal pelo Mercado Pago, descontado na sua conta.',
      'saber.6': 'Até 8 pessoas online. Para grupos maiores, fale conosco para organizar sua mesa.',
      'tapa.eyebrow': 'Reservas Online · Arco',
      'tapa.titulo': 'Reserve sua mesa ',
      'tapa.subtitulo': 'em menos de um minuto',
      'tapa.caption': 'Coquetéis autorais, ótima música e a melhor noite de Mar del Plata.',
      'cumple.tag': 'Aniversários no Arco',
      'cumple.titulo': 'Comemore seu aniversário ',
      'cumple.subtitulo': 'com pizza e batata frita à vontade',
      'cumple.texto': 'Menu de aniversário $19.900 por pessoa: pizza e batata frita à vontade com uma bebida inclusa. Fale conosco para reservar sua mesa.',
      'cumple.btnCumple': 'Comemorar meu aniversário',
      'cumple.btnEvento': 'Organizar meu evento',
      'gen.kicker': 'Informações Gerais',
      'gen.p1': 'Um bar na esquina de Olavarría e Rodríguez Peña com coquetéis autorais, cozinha até tarde e deck ao ar livre.',
      'gen.p2': 'DJs ao vivo aos finais de semana. Comemorações de aniversário, saídas em grupo ou um drink descontraído no balcão.',
      'opin.titulo': 'Avaliações do Google',
      'opin.ver': 'Ver mais avaliações no Google',
      'costado.puntaje': 'Avaliações no Google',
      'costado.ubicacion': 'Localização',
      'costado.comoLlegar': 'Ver no Google Maps',
      'costado.entre': 'Entre San Lorenzo e Roca',
      'pie.texto': '<strong>ARCO</strong> · BAR &amp; COZINHA · MAR DEL PLATA',
      'pap.paso1': 'Quando te esperamos?',
      'pap.paso2': 'Em qual horário?',
      'pap.paso3': 'Seus dados',
      'pap.calAyuda': 'Dias com ponto têm disponibilidade. Dias apagados estão fechados ou lotados.',
      'pap.horariosRotulo': 'Horários disponíveis',
      'pap.dondeRotulo': 'Onde você prefere sentar?',
      'pap.dondeNota': 'Escolha onde prefere ficar: no deck externo aquecido, no salão principal em frente ao bar, ou no salão do fundo com o DJ.',
      'pap.salonB': 'Salão Principal',
      'pap.salonDesc': 'No interior, em frente ao balcão e próximo da música',
      'pap.deckB': 'Deck ao ar livre',
      'pap.deckDesc': 'Na calçada externa com aquecedores',
      'pap.fondoB': 'Salão do Fundo',
      'pap.fondoDesc': 'Ao fundo, coberto e animado, bem perto do DJ',
      'pap.duracionMesa': 'Mesa por 2 horas',
      'pap.comensalesRotulo': 'Quantas pessoas?',
      'pap.comensalesAyuda': 'Até 14 pessoas por esta reserva online.',
      'pap.nombre': 'Nome e Sobrenome *',
      'pap.telefono': 'Telefone / WhatsApp *',
      'pap.email': 'E-mail',
      'pap.cumple': 'Aniversário',
      'pap.cumpleNo': 'Não comemoro',
      'pap.cumpleMes': 'Aniversário este mês',
      'pap.cumpleHoy': 'Comemoro hoje!',
      'pap.notas': 'Observações ou pedidos especiais',
      'pap.politica': 'Sua mesa será reservada com tolerância de 15 minutos.',
      'pap.noche': 'Data',
      'pap.personas': 'Pessoas',
      'pap.hora': 'Horário',
      'pap.donde': 'Espaço',
      'pap.continuar': 'Continuar',
      'pap.confirmar': 'Confirmar reserva',
      'pap.confirmando': '⏳ Confirmando reserva de mesa...',
      'pap.voucherKicker': 'Comprovante de Reserva Confirmada',
      'pap.voucherFecha': 'Data',
      'pap.voucherHora': 'Turno / Horário',
      'pap.voucherComensales': 'Pessoas',
      'pap.voucherEspacio': 'Espaço',
      'pap.voucherTitular': 'Titular',
      'pap.voucherWa': 'Enviar Comprovante por WhatsApp',
      'pap.voucherNuevo': 'Fazer outra reserva',
      'pap.señaAviso': 'Sua mesa, confirmada com o sinal.'
    }
  };

  function applyLanguage(lang) {
    if (!LANGUAGES[lang]) lang = 'es';
    try {
      localStorage.setItem('mise_idioma', lang);
    } catch (_) {}
    document.documentElement.setAttribute('lang', lang);

    var langInfo = LANGUAGES[lang];
    var flagEl = document.querySelector('.idsel__bandera');
    var nameEl = document.querySelector('.idsel__nombre');
    if (flagEl) flagEl.src = langInfo.flag;
    if (nameEl) nameEl.textContent = langInfo.name;

    // Update active state in dropdown
    document.querySelectorAll('.idsel__op').forEach(function(btn) {
      var opLang = btn.getAttribute('data-lang');
      var punto = btn.querySelector('.idsel__punto');
      if (opLang === lang) {
        btn.classList.add('es-elegido');
        btn.setAttribute('aria-selected', 'true');
        if (punto) punto.style.display = 'block';
      } else {
        btn.classList.remove('es-elegido');
        btn.setAttribute('aria-selected', 'false');
        if (punto) punto.style.display = 'none';
      }
    });

    // Translate all elements with data-i18n
    var dict = I18N_DICTIONARY[lang] || I18N_DICTIONARY.es;
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      if (key && dict[key] !== undefined) {
        if (dict[key].indexOf('<') !== -1) {
          el.innerHTML = dict[key];
        } else {
          el.textContent = dict[key];
        }
      }
    });

    // Dispatch event so reservations wizard can translate its dynamic step titles & calendar
    document.dispatchEvent(new CustomEvent('mise:language-change', { detail: { lang: lang } }));
  }

  function initMultiidioma() {
    var savedLang = 'es';
    try {
      savedLang = localStorage.getItem('mise_idioma') || 'es';
    } catch (_) {}

    var idselBoton = document.getElementById('idselBoton') || document.querySelector('.idsel__boton');
    var idselLista = document.getElementById('idselLista') || document.querySelector('.idsel__lista');

    if (idselBoton && idselLista) {
      idselBoton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var isOpen = idselLista.style.display === 'block';
        idselLista.style.display = isOpen ? 'none' : 'block';
        idselBoton.setAttribute('aria-expanded', String(!isOpen));
      });

      document.addEventListener('click', function(e) {
        if (!e.target.closest('.idsel')) {
          idselLista.style.display = 'none';
          idselBoton.setAttribute('aria-expanded', 'false');
        }
      });

      window.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          idselLista.style.display = 'none';
          idselBoton.setAttribute('aria-expanded', 'false');
        }
      });

      document.querySelectorAll('.idsel__op').forEach(function(op) {
        op.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          var chosenLang = op.getAttribute('data-lang') || 'es';
          applyLanguage(chosenLang);
          idselLista.style.display = 'none';
          idselBoton.setAttribute('aria-expanded', 'false');
        });
      });
    }

    applyLanguage(savedLang);
  }

  // -------------------------------------------------------------------------
  // 4. Galería en Pantalla Completa (Visor / Lightbox)
  // -------------------------------------------------------------------------
  function initGalleryVisor() {
    var galleryButtons = document.querySelectorAll('.galeria__foto');
    if (!galleryButtons.length) return;

    var galleryItems = [];
    galleryButtons.forEach(function(btn, idx) {
      var img = btn.querySelector('img');
      if (img) {
        var alt = img.getAttribute('alt') || ('Foto ' + (idx + 1));
        var fullSrc = img.getAttribute('src');
        galleryItems.push({ src: fullSrc, alt: alt });
        btn.setAttribute('data-gallery-idx', String(idx));

        btn.addEventListener('click', function(e) {
          e.preventDefault();
          openVisor(idx);
        });
      }
    });

    var visorEl = null;
    var currentVisorIdx = 0;

    function buildVisorDom() {
      visorEl = document.createElement('div');
      visorEl.className = 'visor';
      visorEl.setAttribute('role', 'dialog');
      visorEl.setAttribute('aria-modal', 'true');
      visorEl.style.display = 'none';
      visorEl.innerHTML = [
        '<div class="visor__caja">',
        '  <img id="visorActiveImg" src="" alt="" />',
        '  <div class="visor__pie">',
        '    <span class="visor__pieTexto" id="visorCaptionText"></span>',
        '    <span class="visor__pieNum" id="visorCounterNum"></span>',
        '  </div>',
        '  <button type="button" class="visor__x" id="visorBtnClose" aria-label="Cerrar">✕</button>',
        '  <button type="button" class="visor__flecha visor__flecha--izq" id="visorBtnPrev" aria-label="Anterior">‹</button>',
        '  <button type="button" class="visor__flecha visor__flecha--der" id="visorBtnNext" aria-label="Siguiente">›</button>',
        '</div>'
      ].join('');

      document.body.appendChild(visorEl);

      visorEl.addEventListener('click', function(e) {
        if (e.target === visorEl) closeVisor();
      });

      var btnClose = document.getElementById('visorBtnClose');
      if (btnClose) {
        btnClose.addEventListener('click', function(e) {
          e.stopPropagation();
          closeVisor();
        });
      }

      var btnPrev = document.getElementById('visorBtnPrev');
      if (btnPrev) {
        btnPrev.addEventListener('click', function(e) {
          e.stopPropagation();
          stepVisor(-1);
        });
      }

      var btnNext = document.getElementById('visorBtnNext');
      if (btnNext) {
        btnNext.addEventListener('click', function(e) {
          e.stopPropagation();
          stepVisor(1);
        });
      }

      window.addEventListener('keydown', function(e) {
        if (!visorEl || visorEl.style.display === 'none') return;
        if (e.key === 'Escape') closeVisor();
        if (e.key === 'ArrowLeft') stepVisor(-1);
        if (e.key === 'ArrowRight') stepVisor(1);
      });
    }

    function openVisor(idx) {
      if (!visorEl) buildVisorDom();
      currentVisorIdx = idx;
      updateVisorDom();
      visorEl.style.display = 'grid';
      document.body.style.overflow = 'hidden';
    }

    function closeVisor() {
      if (!visorEl) return;
      visorEl.style.display = 'none';
      document.body.style.overflow = '';
    }

    function stepVisor(direction) {
      currentVisorIdx = (currentVisorIdx + direction + galleryItems.length) % galleryItems.length;
      updateVisorDom();
    }

    function updateVisorDom() {
      var item = galleryItems[currentVisorIdx];
      if (!item) return;
      var img = document.getElementById('visorActiveImg');
      var cap = document.getElementById('visorCaptionText');
      var count = document.getElementById('visorCounterNum');
      if (img) {
        img.src = item.src;
        img.alt = item.alt;
      }
      if (cap) cap.textContent = item.alt;
      if (count) count.textContent = (currentVisorIdx + 1) + ' / ' + galleryItems.length;
    }
  }

  // -------------------------------------------------------------------------
  // Inicialización
  // -------------------------------------------------------------------------
  function initAll() {
    initReviewsCarousel();
    initTemaToggle();
    initMultiidioma();
    initGalleryVisor();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();`;
