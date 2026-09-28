'use client';

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { FAQ_DOCUMENTATION, FAQCategory, FAQItem, FAQDetail } from "@/lib/faqData";
import styles from "./faq.module.css";

// Accent-insensitive comparison helpers
function cleanString(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default function FAQPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string>("all");
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  // Reset category filters or handle search effect
  useEffect(() => {
    if (searchTerm.trim()) {
      const cleanSearch = cleanString(searchTerm);
      const newExpanded: Record<string, boolean> = {};

      FAQ_DOCUMENTATION.forEach((category) => {
        category.items.forEach((item) => {
          item.details?.forEach((detail, index) => {
            const key = `${item.id}-${index}`;
            const qMatch = cleanString(detail.question).includes(cleanSearch);
            const aMatch = cleanString(detail.answer).includes(cleanSearch);
            if (qMatch || aMatch) {
              newExpanded[key] = true;
            }
          });
        });
      });
      setExpandedItems(newExpanded);
    } else {
      setExpandedItems({});
    }
  }, [searchTerm]);

  const toggleAccordion = (key: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Helper to highlight matching text including accents
  const highlightText = (text: string, search: string) => {
    if (!search.trim()) return text;

    const cleanText = cleanString(text);
    const cleanSearch = cleanString(search);

    const result: React.ReactNode[] = [];
    let currentIndex = 0;

    while (true) {
      const matchIndex = cleanText.indexOf(cleanSearch, currentIndex);
      if (matchIndex === -1) {
        result.push(text.slice(currentIndex));
        break;
      }

      if (matchIndex > currentIndex) {
        result.push(text.slice(currentIndex, matchIndex));
      }

      const matchText = text.slice(matchIndex, matchIndex + cleanSearch.length);
      result.push(
        <span key={matchIndex} className={styles.highlight}>
          {matchText}
        </span>
      );

      currentIndex = matchIndex + cleanSearch.length;
    }

    return <>{result}</>;
  };

  // Filtered FAQ documentation depending on active category and search term
  const filteredData = useMemo(() => {
    const cleanSearch = cleanString(searchTerm);

    return FAQ_DOCUMENTATION.map((category) => {
      // Filter items within this category
      const matchedItems = category.items.filter((item) => {
        if (!cleanSearch) return true;

        const titleMatch = cleanString(item.title).includes(cleanSearch);
        const introMatch = item.intro ? cleanString(item.intro).includes(cleanSearch) : false;
        const tagMatch = item.tags.some((tag) => cleanString(tag).includes(cleanSearch));
        const detailsMatch = item.details?.some(
          (detail) =>
            cleanString(detail.question).includes(cleanSearch) ||
            cleanString(detail.answer).includes(cleanSearch)
        ) || false;

        return titleMatch || introMatch || tagMatch || detailsMatch;
      });

      return {
        ...category,
        items: matchedItems,
      };
    }).filter((category) => {
      // If we are looking for a specific category
      if (activeCategoryId !== "all" && category.id !== activeCategoryId) {
        return false;
      }
      // Only return categories that have matched items
      return category.items.length > 0;
    });
  }, [searchTerm, activeCategoryId]);

  // Compute category match counts for sidebar badges
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    const cleanSearch = cleanString(searchTerm);

    FAQ_DOCUMENTATION.forEach((category) => {
      let count = 0;
      category.items.forEach((item) => {
        if (!cleanSearch) {
          count++;
          return;
        }

        const titleMatch = cleanString(item.title).includes(cleanSearch);
        const introMatch = item.intro ? cleanString(item.intro).includes(cleanSearch) : false;
        const tagMatch = item.tags.some((tag) => cleanString(tag).includes(cleanSearch));
        const detailsMatch = item.details?.some(
          (detail) =>
            cleanString(detail.question).includes(cleanSearch) ||
            cleanString(detail.answer).includes(cleanSearch)
        ) || false;

        if (titleMatch || introMatch || tagMatch || detailsMatch) {
          count++;
        }
      });
      counts[category.id] = count;
      counts.all += count;
    });

    return counts;
  }, [searchTerm]);

  const handleBackToLogin = () => {
    router.push("/login");
  };

  return (
    <div className={styles.container}>
      {/* Background Gradients */}
      <div className={styles.gradientOrb1} />
      <div className={styles.gradientOrb2} />
      <div className={styles.gradientOrb3} />

      <div className={styles.contentCard}>
        {/* Back navigation */}
        <button onClick={handleBackToLogin} className={styles.backButton}>
          <svg
            className={styles.backIcon}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
          Regresar
        </button>

        {/* Title / Description */}
        <header className={styles.header}>
          <h1 className={styles.title}>Documentación de BASE: Guía del Usuario</h1>
          <p className={styles.subtitle}>
            Bienvenido a la documentación oficial de BASE, la herramienta definitiva diseñada para potenciar tu barbería o salón de belleza. Esta guía te mostrará todo lo que puedes lograr con nuestra app y plataforma web.
          </p>
        </header>

        {/* Search Input */}
        <div className={styles.searchWrapper}>
          <svg
            className={styles.searchIcon}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Buscar por palabra clave (ej. NFC, Citas, Supabase, comisión...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className={styles.clearSearch}
              title="Limpiar búsqueda"
            >
              <svg
                className={styles.clearIcon}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Main Section */}
        <div className={styles.layout}>
          {/* Sidebar Tabs */}
          <aside className={styles.sidebar}>
            <button
              className={`${styles.categoryBtn} ${activeCategoryId === "all" ? styles.categoryActive : ""}`}
              onClick={() => setActiveCategoryId("all")}
            >
              <span className={styles.categoryIcon}>📚</span>
              Toda la Guía
              {categoryCounts.all > 0 && (
                <span style={{ fontSize: '0.75rem', opacity: 0.7, marginLeft: 'auto' }}>
                  ({categoryCounts.all})
                </span>
              )}
            </button>
            {FAQ_DOCUMENTATION.map((category) => (
              <button
                key={category.id}
                className={`${styles.categoryBtn} ${activeCategoryId === category.id ? styles.categoryActive : ""}`}
                onClick={() => setActiveCategoryId(category.id)}
              >
                <span className={styles.categoryIcon}>{category.icon}</span>
                {category.name}
                {categoryCounts[category.id] > 0 && (
                  <span style={{ fontSize: '0.75rem', opacity: 0.7, marginLeft: 'auto' }}>
                    ({categoryCounts[category.id]})
                  </span>
                )}
              </button>
            ))}
          </aside>

          {/* Main FAQ list */}
          <main className={styles.mainPanel}>
            {filteredData.length === 0 ? (
              <div className={styles.noResults}>
                <span className={styles.noResultsIcon}>🔍</span>
                <h3 className={styles.noResultsTitle}>No se encontraron resultados</h3>
                <p className={styles.noResultsDesc}>
                  Intenta buscar con otros términos, como "inventario", "comisión", "WhatsApp" o "pago único".
                </p>
              </div>
            ) : (
              filteredData.map((category) => (
                <section key={category.id} className={styles.section}>
                  <h2 className={styles.sectionTitle}>{category.name}</h2>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {category.items.map((item) => (
                      <div key={item.id}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.75rem', color: '#1e293b' }}>
                          {highlightText(item.title, searchTerm)}
                        </h3>
                        {item.intro && (
                          <p className={styles.sectionIntro}>
                            {highlightText(item.intro, searchTerm)}
                          </p>
                        )}
                        {item.details && item.details.length > 0 && (
                          <div className={styles.accordionList}>
                            {item.details.map((detail, index) => {
                              const key = `${item.id}-${index}`;
                              const isOpen = !!expandedItems[key];
                              return (
                                <div
                                  key={index}
                                  className={`${styles.accordionItem} ${isOpen ? styles.accordionItemActive : ""}`}
                                >
                                  <button
                                    className={styles.accordionHeader}
                                    onClick={() => toggleAccordion(key)}
                                  >
                                    <span className={styles.questionText}>
                                      {highlightText(detail.question, searchTerm)}
                                    </span>
                                    <svg
                                      className={styles.chevronIcon}
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                                      />
                                    </svg>
                                  </button>
                                  <div
                                    className={`${styles.accordionCollapse} ${isOpen ? styles.accordionCollapseOpen : ""}`}
                                    style={{
                                      // Force height constraints for smooth transition if needed,
                                      // max-height handles it smoothly.
                                    }}
                                  >
                                    <div className={styles.accordionContent}>
                                      {highlightText(detail.answer, searchTerm)}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ))
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
