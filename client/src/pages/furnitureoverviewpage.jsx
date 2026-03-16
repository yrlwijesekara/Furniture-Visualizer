import axios from "axios";
import toast from "react-hot-toast";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import Navbar from "../components/Navbar";
import ImageSlider from "../components/imageslider";

export default function FurnitureOverviewPage() {
	const { furnitureId } = useParams();
	const navigate = useNavigate();

	const [item, setItem] = useState(null);
	const [status, setStatus] = useState("loading");
	const [isLoggedIn, setIsLoggedIn] = useState(false);
	const [isInCart, setIsInCart] = useState(false);
	const [quantity, setQuantity] = useState(1);

	useEffect(() => {
		const checkAuth = () => {
			const token = localStorage.getItem("token");
			setIsLoggedIn(Boolean(token));
		};

		checkAuth();
		window.addEventListener("storage", checkAuth);
		const interval = setInterval(checkAuth, 1000);

		return () => {
			window.removeEventListener("storage", checkAuth);
			clearInterval(interval);
		};
	}, []);

	useEffect(() => {
		const fetchFurniture = async () => {
			try {
				setStatus("loading");
				let furniture = null;

				try {
					const response = await axios.get(
						`${import.meta.env.VITE_BACKEND_URL}/api/furniture/${furnitureId}`,
					);
					furniture = response.data?.data;
				} catch (singleError) {
					if (singleError?.response?.status === 404) {
						const allResponse = await axios.get(
							`${import.meta.env.VITE_BACKEND_URL}/api/furniture/all`,
						);
						const items = Array.isArray(allResponse.data) ? allResponse.data : [];
						furniture = items.find((entry) => String(entry?._id) === String(furnitureId));

						if (!furniture) {
							throw new Error("Furniture item not found");
						}
					} else {
						throw singleError;
					}
				}

				setItem(furniture);

				const cart = JSON.parse(localStorage.getItem("furnitureCart")) || [];
				const existing = cart.find((cartItem) => cartItem._id === furniture?._id);

				if (existing) {
					setIsInCart(true);
					setQuantity(existing.quantity || 1);
				} else {
					setIsInCart(false);
					setQuantity(1);
				}

				setStatus("success");
			} catch (error) {
				console.error("Error fetching furniture details:", error);
				toast.error(error?.message || "Error fetching furniture details");
				setStatus("error");
			}
		};

		if (furnitureId) {
			fetchFurniture();
		}
	}, [furnitureId]);

	useEffect(() => {
		const syncCartState = () => {
			const cart = JSON.parse(localStorage.getItem("furnitureCart")) || [];
			if (!item) {
				return;
			}

			const existing = cart.find((cartItem) => cartItem._id === item._id);
			if (existing) {
				setIsInCart(true);
				setQuantity(existing.quantity || 1);
			} else {
				setIsInCart(false);
				setQuantity(1);
			}
		};

		window.addEventListener("cartUpdated", syncCartState);
		return () => {
			window.removeEventListener("cartUpdated", syncCartState);
		};
	}, [item]);

	const imageList = useMemo(() => {
		if (!item?.image) {
			return [];
		}

		if (Array.isArray(item.image)) {
			return item.image.filter(Boolean);
		}

		return [item.image];
	}, [item]);

	const totalPrice = (item?.price || 0) * quantity;

	const modelLink = useMemo(() => {
		if (!item?.model3DUrl) {
			return null;
		}

		if (item.model3DUrl.startsWith("http")) {
			return item.model3DUrl;
		}

		const normalized = item.model3DUrl.replace(/^src\//, "");
		return `${import.meta.env.VITE_BACKEND_URL}/${normalized}`;
	}, [item]);

	const handleAddToCart = () => {
		if (!isLoggedIn) {
			toast.error("Please login first to add items to cart");
			navigate("/login");
			return;
		}

		if (!item) {
			return;
		}

		const cart = JSON.parse(localStorage.getItem("furnitureCart")) || [];
		const existingIndex = cart.findIndex((cartItem) => cartItem._id === item._id);

		if (existingIndex > -1) {
			cart[existingIndex].quantity = quantity;
			toast.success("Cart quantity updated");
		} else {
			cart.push({ ...item, quantity });
			toast.success("Furniture added to cart");
		}

		localStorage.setItem("furnitureCart", JSON.stringify(cart));
		setIsInCart(true);
		window.dispatchEvent(new Event("cartUpdated"));
	};

	const handleBuyNow = () => {
		if (!isLoggedIn) {
			toast.error("Please login first to continue");
			navigate("/login");
			return;
		}

		handleAddToCart();
		navigate("/cart");
	};

	return (
		<div className="min-h-screen bg-black">
			<Navbar />

			<div className="w-full h-[calc(100vh-80px)] overflow-y-auto scrollbar-hide">
				{status === "loading" && (
					<div className="flex justify-center items-center min-h-[60vh]">
						<div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
					</div>
				)}

				{status === "error" && (
					<div className="flex justify-center items-center min-h-[60vh]">
						<p className="text-red-400 text-lg">Error loading furniture item.</p>
					</div>
				)}

				{status === "success" && item && (
					<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-start">
							<div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-4 sm:p-5">
								<ImageSlider images={imageList} />
							</div>

							<div className="space-y-5">
								<div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-5">
									<h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
										{item.name}
									</h1>
									<p className="inline-flex px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/30">
										{item.category}
									</p>
									{item.description?.trim() && (
										<p className="text-slate-300 mt-4 leading-relaxed wrap-break-word whitespace-pre-line max-h-36 overflow-y-auto pr-1">
											{item.description}
										</p>
									)}
								</div>

								<div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-5">
									<h3 className="text-lg font-semibold text-white mb-3">Pricing</h3>
									<p className="text-2xl sm:text-3xl font-bold text-emerald-400">
										Rs. {(item.price || 0).toLocaleString()}
									</p>
									<p className="text-slate-400 text-sm mt-1">Base unit price</p>

									<div className="mt-4">
										<label className="block text-sm font-medium text-slate-200 mb-2">
											Quantity
										</label>
										<div className="flex items-center gap-3">
											<button
												onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
												className="w-10 h-10 rounded-full bg-slate-200 text-slate-800 font-bold"
											>
												-
											</button>
											<input
												type="number"
												min="1"
												max="99"
												value={quantity}
												onChange={(e) => {
													const value = parseInt(e.target.value, 10);
													if (!Number.isNaN(value) && value >= 1 && value <= 99) {
														setQuantity(value);
													}
												}}
												className="w-24 px-3 py-2 rounded-lg text-center border border-slate-400 bg-white text-slate-900 font-semibold"
											/>
											<button
												onClick={() => setQuantity((prev) => Math.min(99, prev + 1))}
												className="w-10 h-10 rounded-full bg-slate-200 text-slate-800 font-bold"
											>
												+
											</button>
										</div>
									</div>

									<div className="mt-4 border-t border-white/20 pt-3">
										<p className="text-slate-300 text-sm">Total Price</p>
										<p className="text-2xl font-bold text-emerald-400">
											Rs. {totalPrice.toLocaleString()}
										</p>
									</div>
								</div>

								<div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-5">
									<h3 className="text-lg font-semibold text-white mb-3">Actions</h3>
									<div className="space-y-3">
										

										<button
											onClick={handleBuyNow}
											disabled={!isLoggedIn}
											className="w-full font-semibold py-3 rounded-lg transition-colors duration-200"
											style={{
												backgroundColor: !isLoggedIn ? "#95a5a6" : "#16a34a",
												color: !isLoggedIn ? "#7f8c8d" : "white",
												cursor: !isLoggedIn ? "not-allowed" : "pointer",
												opacity: !isLoggedIn ? 0.7 : 1,
											}}
										>
											{!isLoggedIn ? "Login to Continue" : "Buy Now"}
										</button>
                                        <button
											onClick={() => navigate("/furniture")}
											className="w-full font-medium py-3 rounded-lg border border-slate-400 text-slate-200 hover:bg-white/10 transition-colors duration-200"
										>
                                            Back to Furniture List
                                            
											
										</button>

										<button
											onClick={() => navigate("/viewer-3d")}
											className="w-full font-medium py-3 rounded-lg border border-slate-400 text-slate-200 hover:bg-white/10 transition-colors duration-200"
										>
											
                                            view 3D 
										</button>
									</div>
								</div>

								
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
