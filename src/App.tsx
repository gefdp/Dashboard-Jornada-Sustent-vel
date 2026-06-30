import * as echarts from "echarts";
import JSZip from "jszip";
import { ClipboardCheck, Expand, FileDown, Gauge, Leaf, Loader2, Minimize, Moon, Star, Sun } from "lucide-react";
import { toPng } from "html-to-image";
import { useEffect, useRef, useState } from "react";
import "./App.css";
import { AvaliacaoPage } from "./pages/AvaliacaoPage";
import { CredenciamentoPage } from "./pages/CredenciamentoPage";
import { EficienciaPage } from "./pages/EficienciaPage";
import type { DashboardData, GeoJsonFeatureCollection, RawDashboardData, RegionByMunicipality } from "./types";
import { normalizeDashboardData } from "./utils/data";

type PageId = "credenciamento" | "avaliacao" | "eficiencia";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      data: DashboardData;
      geoJson: GeoJsonFeatureCollection;
      regions: RegionByMunicipality;
    };

const pages = [
  { id: "credenciamento" as const, label: "Credenciamento", icon: ClipboardCheck },
  { id: "avaliacao" as const, label: "Avaliação", icon: Star },
  { id: "eficiencia" as const, label: "Eficiência", icon: Gauge },
];

function App() {
  const [activePage, setActivePage] = useState<PageId>("credenciamento");
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("theme") === "dark");
  const downloadWrapRef = useRef<HTMLDivElement>(null);
  const dashboardFrameRef = useRef<HTMLElement>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const [dataResponse, geoResponse, regionsResponse] = await Promise.all([
          fetch(`${import.meta.env.BASE_URL}data/jornada_sustentavel.json`),
          fetch(`${import.meta.env.BASE_URL}data/paraiba-municipios.geojson`),
          fetch(`${import.meta.env.BASE_URL}data/paraiba-regioes.json`),
        ]);

        if (!dataResponse.ok) throw new Error("Não foi possível carregar o JSON da jornada.");
        if (!geoResponse.ok) throw new Error("Não foi possível carregar o mapa da Paraíba.");
        if (!regionsResponse.ok) throw new Error("Não foi possível carregar as regiões da Paraíba.");

        const rawData = (await dataResponse.json()) as RawDashboardData;
        const geoJson = (await geoResponse.json()) as GeoJsonFeatureCollection;
        const regions = (await regionsResponse.json()) as RegionByMunicipality;
        const data = normalizeDashboardData(rawData);
        echarts.registerMap("Paraiba", geoJson as unknown as Parameters<typeof echarts.registerMap>[1]);

        if (mounted) setLoadState({ status: "ready", data, geoJson, regions });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erro inesperado ao carregar os dados.";
        if (mounted) setLoadState({ status: "error", message });
      }
    }

    loadData();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (downloadWrapRef.current && !downloadWrapRef.current.contains(event.target as Node)) {
        setShowDownloadMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  function waitForDashboardPaint() {
    return new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.setTimeout(resolve, 350);
        });
      });
    });
  }

  async function captureDashboardPng() {
    const node = dashboardFrameRef.current;
    if (!node || loadState.status !== "ready") return null;

    await waitForDashboardPaint();
    const previousScrollTop = node.scrollTop;
    const fullWidth = node.scrollWidth;
    const fullHeight = node.scrollHeight;

    node.scrollTop = 0;

    try {
      return await toPng(node, {
        cacheBust: true,
        pixelRatio: 3,
        width: fullWidth,
        height: fullHeight,
        backgroundColor: darkMode ? "#061f1c" : "#f4fbf8",
        style: {
          width: `${fullWidth}px`,
          height: `${fullHeight}px`,
          maxHeight: "none",
          overflow: "visible",
          transform: "scale(1)",
          transformOrigin: "top left",
        },
      });
    } finally {
      node.scrollTop = previousScrollTop;
    }
  }

  function downloadDataUrl(dataUrl: string, fileName: string) {
    const link = document.createElement("a");
    link.download = fileName;
    link.href = dataUrl;
    link.click();
  }

  function downloadBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = fileName;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }

  function dataUrlToBase64(dataUrl: string) {
    return dataUrl.split(",")[1] ?? "";
  }

  async function exportCurrentPage(pageId: PageId) {
    setIsExporting(true);
    try {
      const dataUrl = await captureDashboardPng();
      if (!dataUrl) return;
      const date = new Date().toISOString().slice(0, 10);
      downloadDataUrl(dataUrl, `jornada-sustentavel-${pageId}-${date}.png`);
    } catch (error) {
      console.error("Erro ao exportar imagem do painel", error);
      window.alert("Não foi possível baixar a imagem agora. Tente novamente em alguns segundos.");
    } finally {
      setIsExporting(false);
    }
  }

  async function exportAllPages() {
    if (loadState.status !== "ready") return;
    const originalPage = activePage;
    setShowDownloadMenu(false);
    setIsExporting(true);

    try {
      const zip = new JSZip();
      const date = new Date().toISOString().slice(0, 10);

      for (const page of pages) {
        setActivePage(page.id);
        await waitForDashboardPaint();
        const dataUrl = await captureDashboardPng();
        if (dataUrl) {
          zip.file(`jornada-sustentavel-${page.id}-${date}.png`, dataUrlToBase64(dataUrl), { base64: true });
        }
      }

      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, `jornada-sustentavel-todas-as-paginas-${date}.zip`);
      setActivePage(originalPage);
    } catch (error) {
      console.error("Erro ao exportar todas as páginas", error);
      setActivePage(originalPage);
      window.alert("Não foi possível baixar todas as páginas agora. Tente novamente em alguns segundos.");
    } finally {
      setIsExporting(false);
    }
  }

  async function handleDownload(pageId?: PageId) {
    setShowDownloadMenu(false);
    const targetPage = pageId ?? activePage;
    if (targetPage !== activePage) {
      setActivePage(targetPage);
      await waitForDashboardPaint();
      await exportCurrentPage(targetPage);
    } else {
      await exportCurrentPage(targetPage);
    }
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  return (
    <div className="app-shell">
      {/* ─── Sidebar ─── */}
      <aside className="sidebar">
        {/* Brand */}
        <div className="sidebar__brand">
          <div className="sidebar__seal" aria-label="Escola Sustentável" role="img" />
          <div className="sidebar__brand-text">
            <span>Jornada Formativa</span>
            <strong>Escola Sustentável</strong>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar__nav" aria-label="Páginas do dashboard">
          {pages.map((page) => {
            const Icon = page.icon;
            const active = activePage === page.id;
            return (
              <button
                key={page.id}
                className={`sidebar__nav-item${active ? " sidebar__nav-item--active" : ""}`}
                type="button"
                onClick={() => setActivePage(page.id)}
              >
                <Icon size={18} aria-hidden="true" />
                {page.label}
              </button>
            );
          })}
        </nav>

        {/* Footer: utilities + theme + logos */}
        <div className="sidebar__footer">
          <div className="sidebar__divider" />

          {/* Download */}
          <div className="sidebar__download-wrap" ref={downloadWrapRef}>
            <button
              className="sidebar__util-btn"
              type="button"
              onClick={() => setShowDownloadMenu((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={showDownloadMenu}
              disabled={isExporting || loadState.status !== "ready"}
            >
              {isExporting ? <Loader2 className="spin" size={17} aria-hidden="true" /> : <FileDown size={17} aria-hidden="true" />}
              {isExporting ? "Gerando arquivo" : "Baixar"}
            </button>

            {showDownloadMenu && (
              <div className="download-menu" role="menu">
                <div className="download-menu__label">Sem menu lateral</div>
                <button className="download-menu__item download-menu__item--all" role="menuitem" type="button" onClick={() => void exportAllPages()}>
                  <FileDown size={15} aria-hidden="true" />
                  Todas as páginas
                </button>
                <button className="download-menu__item download-menu__item--all" role="menuitem" type="button" onClick={() => handleDownload()}>
                  <FileDown size={15} aria-hidden="true" />
                  Página atual
                </button>
                <div className="download-menu__divider" />
                {pages.map((page) => {
                  const Icon = page.icon;
                  return (
                    <button key={page.id} className="download-menu__item" role="menuitem" type="button" onClick={() => handleDownload(page.id)}>
                      <Icon size={15} aria-hidden="true" />
                      {page.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Fullscreen */}
          <button className="sidebar__util-btn" type="button" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize size={17} aria-hidden="true" /> : <Expand size={17} aria-hidden="true" />}
            {isFullscreen ? "Sair tela cheia" : "Tela cheia"}
          </button>

          <div className="sidebar__divider" />

          {/* Theme toggle switch */}
          <div className="sidebar__theme-row">
            {darkMode
              ? <Sun size={13} aria-hidden="true" />
              : <Moon size={13} aria-hidden="true" />}
            <span>{darkMode ? "Modo claro" : "Modo escuro"}</span>
            <button
              className={`sidebar__theme-switch${darkMode ? " sidebar__theme-switch--on" : ""}`}
              type="button"
              role="switch"
              aria-checked={darkMode}
              aria-label="Alternar tema"
              onClick={() => setDarkMode((d) => !d)}
            >
              <span className="sidebar__theme-switch__knob" />
            </button>
          </div>

          <div className="sidebar__divider" />

          {/* Logos — coloque logo-1.png e logo-2.png em public/assets/ */}
          <div className="sidebar__logos">
            <div className="sidebar__logo-slot sidebar__logo-slot--1" role="img" aria-label="Logo institucional 1" />
            <div className="sidebar__logo-slot sidebar__logo-slot--2" role="img" aria-label="Logo institucional 2" />
          </div>
        </div>
      </aside>

      {/* ─── Main area ─── */}
      <div className="main-area">
        <main className="dashboard-frame" ref={dashboardFrameRef}>
          {loadState.status === "loading" ? (
            <section className="state-card">
              <Loader2 className="spin" size={34} aria-hidden="true" />
              <h1>Carregando painel</h1>
              <p>Preparando dados, filtros e visualizações.</p>
            </section>
          ) : null}

          {loadState.status === "error" ? (
            <section className="state-card state-card--error">
              <Leaf size={34} aria-hidden="true" />
              <h1>Dados indisponíveis</h1>
              <p>{loadState.message}</p>
            </section>
          ) : null}

          {loadState.status === "ready" && activePage === "credenciamento" ? (
            <CredenciamentoPage
              credentials={loadState.data.credentials}
              geoJson={loadState.geoJson}
              regions={loadState.regions}
              darkMode={darkMode}
            />
          ) : null}
          {loadState.status === "ready" && activePage === "avaliacao" ? (
            <AvaliacaoPage evaluations={loadState.data.evaluations} regions={loadState.regions} darkMode={darkMode} />
          ) : null}
          {loadState.status === "ready" && activePage === "eficiencia" ? (
            <EficienciaPage schools={loadState.data.schools} darkMode={darkMode} />
          ) : null}
        </main>
      </div>
    </div>
  );
}

export default App;
