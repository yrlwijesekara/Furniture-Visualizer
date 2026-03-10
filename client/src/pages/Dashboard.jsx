import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { designService } from "../services/designService.js";
import { furnitureService } from "../services/furnitureService.js";
import Navbar from "../components/Navbar.jsx";
import Furniture from "./furniture.jsx";
import FurnitureCard from "../components/FurnitureCard.jsx";
import { IoHome } from "react-icons/io5";
import { FaBed } from "react-icons/fa";
import { PiDeskFill } from "react-icons/pi";
import { GiSofa } from "react-icons/gi";
import Footer from "../components/footer.jsx";

export default function Dashboard() {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDesignName, setNewDesignName] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [popularFurniture, setPopularFurniture] = useState([]);
  const [latestFurniture, setLatestFurniture] = useState([]);
  const [allFurniture, setAllFurniture] = useState([]);
  const [furnitureLoading, setFurnitureLoading] = useState(true);
  const navigate = useNavigate();

  // Category icon mapping
  const categoryIcons = {
    Chair: <GiSofa />,
    Sofa: <GiSofa />,
    Table: <PiDeskFill />,
    Bed: <FaBed />,
    Lamp: "💡",
    Desk: <PiDeskFill />,
    Cabinet: "🗄️",
    Bookshelf: "📚",
    Dining: "🍽️",
    "Living Room": "🛋️",
    Bedroom: <FaBed />,
    Office: "🏢",
    All: <IoHome />,
  };

  // Generate dynamic categories from furniture data
  const getDynamicCategories = () => {
    if (!allFurniture.length)
      return [{ name: "All", icon: "🏠", count: "0 Items Available" }];

    // Count furniture by category
    const categoryCount = allFurniture.reduce((acc, item) => {
      const category = item.category || "Uncategorized";
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    // Create category objects with All option
    const categories = [
      {
        name: "All",
        icon: categoryIcons["All"],
        count: `${allFurniture.length} Items Available`,
      },
    ];

    Object.entries(categoryCount).forEach(([category, count]) => {
      categories.push({
        name: category,
        icon: categoryIcons[category] || "📦", // Default icon for unknown categories
        count: `${count} ${count === 1 ? "Item" : "Items"} Available`,
      });
    });

    return categories;
  };

  // Filter furniture by selected category
  const getFilteredFurniture = (furnitureArray, limit = null) => {
    let filtered =
      activeCategory === "All"
        ? furnitureArray
        : furnitureArray.filter((item) => item.category === activeCategory);

    return limit ? filtered.slice(0, limit) : filtered;
  };

  useEffect(() => {
    loadDesigns();
    loadFurniture();
  }, []);

  async function loadDesigns() {
    try {
      setLoading(true);
      const data = await designService.list();
      setDesigns(data);
    } catch (err) {
      console.error("Failed to load designs", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadFurniture() {
    try {
      setFurnitureLoading(true);
      const [popular, latest, all] = await Promise.all([
        furnitureService.getPopular(4),
        furnitureService.getLatest(4),
        furnitureService.getAll(),
      ]);
      setPopularFurniture(popular);
      setLatestFurniture(latest);
      setAllFurniture(all);
    } catch (err) {
      console.error("Failed to load furniture", err);
    } finally {
      setFurnitureLoading(false);
    }
  }

  async function handleCreateDesign(e) {
    e.preventDefault();
    if (!newDesignName.trim()) return;
    try {
      const design = await designService.create({
        name: newDesignName,
        room: { width: 800, height: 600, gridSize: 50 },
        items: [],
      });
      setDesigns([design, ...designs]);
      setNewDesignName("");
      setShowCreateModal(false);
      navigate(`/editor-2d?id=${design._id}`);
    } catch (err) {
      alert("Failed to create design");
    }
  }

  async function handleDeleteDesign(id) {
    if (!window.confirm("Delete this design?")) return;
    try {
      await designService.remove(id);
      setDesigns(designs.filter((d) => d._id !== id));
    } catch (err) {
      alert("Failed to delete");
    }
  }

  async function handleDuplicateDesign(design) {
    try {
      const copy = await designService.create({
        name: `${design.name} (Copy)`,
        room: design.room,
        items: design.items,
      });
      setDesigns([copy, ...designs]);
    } catch (err) {
      alert("Failed to duplicate");
    }
  }

  const filteredDesigns = designs.filter((d) =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const recentCount = designs.filter((d) => {
    const updated = new Date(d.updatedAt);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return updated > weekAgo;
  }).length;

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* ===== HERO SECTION ===== */}
      <section
        className="w-full h-[400px] sm:h-[500px] lg:h-[616px] -mt-[80px] relative flex flex-col items-center justify-center bg-cover bg-center bg-no-repeat px-4"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url('https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1440&h=696&fit=crop')`,
        }}
      >
        <h1 className="font-kufam font-medium text-[28px] sm:text-[36px] lg:text-[48px] leading-tight text-center text-[#F5F5F5] max-w-[324px] sm:max-w-[624px] lg:max-w-[824px] px-4">
          Elevate Your Home Decor with Our Premium Furniture Collection
        </h1>
        <button className="mt-[18px] w-[160px] sm:w-[180px] lg:w-[192px] h-[50px] sm:h-[55px] lg:h-[59px] bg-white rounded-[5px] flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors">
          <span className="font-kufam font-medium text-[18px] sm:text-[20px] lg:text-[24px] leading-tight text-black">
            Contact Us
          </span>
        </button>
      </section>

      {/* ===== CATEGORY SECTION ===== */}
      <section className="max-w-[1440px] mx-auto pt-[20px] sm:pt-[30px] lg:pt-[40px] pb-[20px] sm:pb-[30px] lg:pb-[40px]">
        <h2 className="font-kufam font-medium text-[20px] sm:text-[22px] lg:text-[24px] leading-tight text-black text-center mb-[20px] sm:mb-[30px] lg:mb-[40px] px-4">
          Category
        </h2>
        <div className="flex justify-start sm:justify-center gap-[15px] sm:gap-[20px] lg:gap-[25px] px-4 sm:px-[25px] lg:px-[50px] overflow-x-auto pb-4">
          {getDynamicCategories().map((cat) => (
            <div
              key={cat.name}
              onClick={() => setActiveCategory(cat.name)}
              className={`min-w-[180px] sm:min-w-[200px] lg:min-w-[248px] h-[120px] sm:h-[140px] lg:h-[162px] rounded-[10px] flex flex-col items-center justify-center cursor-pointer transition-colors flex-shrink-0
                ${
                  activeCategory === cat.name
                    ? "bg-[#527A9A] text-white shadow-[0_0_16px_rgba(9,43,66,0.25)]"
                    : "bg-[#F7FBFF] text-black shadow-[0_0_16px_rgba(9,43,66,0.25)]"
                }`}
            >
              <div
                className={`text-[28px] sm:text-[32px] lg:text-[40px] mb-[4px] sm:mb-[6px] ${
                  activeCategory === cat.name ? "text-white" : "text-[#092B42]"
                }`}
              >
                {cat.icon}
              </div>
              <p className="font-kufam font-medium text-[16px] sm:text-[18px] lg:text-[20px] leading-tight text-center px-2">
                {cat.name}
              </p>
              <p className="font-kufam font-normal text-[12px] sm:text-[13px] lg:text-[14px] leading-tight mt-[4px] sm:mt-[6px] text-center px-2">
                {cat.count}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== POPULAR PRODUCT ===== */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-[25px] lg:px-[50px] pb-[20px] sm:pb-[30px] lg:pb-[40px]">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-[20px] sm:mb-[30px] lg:mb-[40px] gap-4">
          <h2 className="font-kufam font-medium text-[20px] sm:text-[22px] lg:text-[24px] leading-tight text-black">
            Popular Product
          </h2>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigate(
                `/furniture${activeCategory !== "All" ? `?category=${encodeURIComponent(activeCategory)}` : ""}`,
              );
            }}
            className="font-kufam font-normal text-[16px] sm:text-[18px] lg:text-[20px] leading-tight text-black hover:underline cursor-pointer self-start sm:self-auto"
          >
            See all
          </a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
          {furnitureLoading ? (
            // Loading skeleton
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="w-full min-h-[380px] sm:min-h-[400px] lg:min-h-[440px] bg-gray-200 animate-pulse rounded-[10px]"
              >
                <div className="w-full h-[200px] sm:h-[220px] lg:h-[240px] bg-gray-300 rounded-lg mx-auto mb-4"></div>
                <div className="h-4 bg-gray-300 rounded mb-2 mx-4"></div>
                <div className="h-4 bg-gray-300 rounded mb-4 w-3/4 mx-4"></div>
                <div className="h-8 bg-gray-300 rounded mx-4"></div>
              </div>
            ))
          ) : getFilteredFurniture(popularFurniture, 4).length > 0 ? (
            getFilteredFurniture(popularFurniture, 4).map((furniture) => (
              <FurnitureCard key={furniture._id} furniture={furniture} />
            ))
          ) : (
            <div className="col-span-full text-center py-8">
              <p className="text-gray-500 text-[14px] sm:text-[16px]">
                {activeCategory === "All"
                  ? "No popular furniture available"
                  : `No ${activeCategory} furniture in popular section`}
              </p>
            </div>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}
