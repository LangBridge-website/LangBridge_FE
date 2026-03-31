import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import {
	colors,
	formFieldLightStyle,
	typography,
} from "../constants/designTokens";
import { Button } from "../components/Button";
import { inquiryApi } from "../services/inquiryApi";
import type {
	InquiryDetail as InquiryDetailType,
	InquiryReply,
} from "../services/inquiryApi";
import { useUser } from "../contexts/UserContext";
import { UserRole } from "../types/user";
import { dispatchInquiryBadgeRefresh } from "../hooks/useInquiryBadge";

function formatDate(iso: string) {
	try {
		return new Date(iso).toLocaleString("ko-KR", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
		});
	} catch {
		return iso;
	}
}

function nameInitial(name: string) {
	const t = name.trim();
	if (!t) return "?";
	return t.slice(0, 1);
}

function UserAvatar({
	name,
	size = 40,
	bg,
}: {
	name: string;
	size?: number;
	bg?: string;
}) {
	return (
		<div
			className="flex-shrink-0 rounded-full flex items-center justify-center font-semibold text-white select-none"
			style={{
				width: size,
				height: size,
				fontSize: size * 0.38,
				backgroundColor: bg ?? "#64748b",
				fontFamily: typography.fontFamily,
			}}
			aria-hidden
		>
			{nameInitial(name)}
		</div>
	);
}

export default function InquiryDetail() {
	const { id } = useParams<{ id: string }>();
	const inquiryId = Number(id);
	const navigate = useNavigate();
	const { user } = useUser();

	const [data, setData] = useState<InquiryDetailType | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [replyBody, setReplyBody] = useState("");
	const [editingReplyId, setEditingReplyId] = useState<number | null>(null);
	const [editingText, setEditingText] = useState("");

	const isAdmin =
		user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.ADMIN;
	const isAuthor = user && data && user.id === data.author.id;

	const load = useCallback(async () => {
		if (!Number.isFinite(inquiryId)) {
			setError("잘못된 요청입니다.");
			setLoading(false);
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const d = await inquiryApi.getDetail(inquiryId);
			setData(d);
			dispatchInquiryBadgeRefresh();
		} catch {
			setError("문의를 불러오지 못했습니다.");
			setData(null);
		} finally {
			setLoading(false);
		}
	}, [inquiryId]);

	useEffect(() => {
		load();
	}, [load]);

	const handleDeleteInquiry = async () => {
		if (!data || !window.confirm("이 문의를 삭제할까요?")) return;
		try {
			await inquiryApi.delete(data.id);
			dispatchInquiryBadgeRefresh();
			navigate("/inquiries");
		} catch (e: unknown) {
			const msg =
				e && typeof e === "object" && "response" in e
					? (e as { response?: { data?: { error?: string } } }).response?.data
							?.error
					: null;
			alert(msg || "삭제에 실패했습니다.");
		}
	};

	const handleSubmitReply = async () => {
		if (!data || !replyBody.trim()) return;
		try {
			await inquiryApi.createReply(data.id, replyBody.trim());
			setReplyBody("");
			await load();
			dispatchInquiryBadgeRefresh();
		} catch (e: unknown) {
			const msg =
				e && typeof e === "object" && "response" in e
					? (e as { response?: { data?: { error?: string } } }).response?.data
							?.error
					: null;
			alert(msg || "답변 등록에 실패했습니다.");
		}
	};

	const handleSaveEditReply = async (replyId: number) => {
		if (!data || !editingText.trim()) return;
		try {
			await inquiryApi.updateReply(data.id, replyId, editingText.trim());
			setEditingReplyId(null);
			await load();
			dispatchInquiryBadgeRefresh();
		} catch (e: unknown) {
			const msg =
				e && typeof e === "object" && "response" in e
					? (e as { response?: { data?: { error?: string } } }).response?.data
							?.error
					: null;
			alert(msg || "수정에 실패했습니다.");
		}
	};

	const handleDeleteReply = async (replyId: number) => {
		if (!data || !window.confirm("이 답변을 삭제할까요?")) return;
		try {
			await inquiryApi.deleteReply(data.id, replyId);
			await load();
			dispatchInquiryBadgeRefresh();
		} catch (e: unknown) {
			const msg =
				e && typeof e === "object" && "response" in e
					? (e as { response?: { data?: { error?: string } } }).response?.data
							?.error
					: null;
			alert(msg || "삭제에 실패했습니다.");
		}
	};

	if (loading) {
		return (
			<div className="p-8" style={{ color: colors.secondaryText }}>
				불러오는 중…
			</div>
		);
	}

	if (error || !data) {
		return (
			<div className="p-8">
				<p style={{ color: "#b91c1c" }}>
					{error || "문의를 찾을 수 없습니다."}
				</p>
				<Link to="/inquiries" className="text-sm underline mt-2 inline-block">
					목록으로
				</Link>
			</div>
		);
	}

	const replyCount = data.replies.length;

	return (
		<div
			className="min-h-full p-6 md:p-8 pb-12"
			style={{ backgroundColor: "#f4f4f5", color: colors.primaryText }}
		>
			<div
				className="mx-auto space-y-4 px-[2vw] sm:px-0"
				style={{ width: "min(92vw, 56rem)", maxWidth: "100%" }}
			>
				<Link
					to="/inquiries"
					className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
					style={{ color: colors.secondaryText }}
				>
					← 목록으로
				</Link>

				{/* 원글 + 답변 스레드: 단일 카드 */}
				<article
					className="rounded-xl border shadow-sm overflow-hidden"
					style={{
						borderColor: colors.border,
						backgroundColor: colors.surface,
					}}
				>
					{/* 원글 */}
					<div className="p-5 md:p-6">
						<div className="flex gap-4">
							<UserAvatar name={data.author.name} size={44} bg="#475569" />
							<div className="flex-1 min-w-0">
								<div className="flex items-start justify-between gap-3 mb-2">
									<h1
										className="font-semibold leading-snug min-w-0 flex-1"
										style={{
											fontFamily: typography.fontFamily,
											fontSize: "clamp(1.1rem, 1.2vw + 0.6rem, 1.5rem)",
										}}
									>
										{data.title}
									</h1>
									{isAuthor && !data.locked && (
										<div className="flex gap-1 flex-shrink-0 pt-0.5">
											<Button
												variant="secondary"
												onClick={() => navigate(`/inquiries/${data.id}/edit`)}
												style={{
													padding: "3px 8px",
													fontSize: "11px",
													lineHeight: 1.3,
												}}
											>
												수정
											</Button>
											<Button
												variant="danger"
												onClick={handleDeleteInquiry}
												style={{
													padding: "3px 8px",
													fontSize: "11px",
													lineHeight: 1.3,
												}}
											>
												삭제
											</Button>
										</div>
									)}
								</div>
								<div
									className="flex flex-wrap items-center gap-2 text-sm"
									style={{ color: colors.secondaryText }}
								>
									<span
										className="font-medium"
										style={{ color: colors.primaryText }}
									>
										{data.author.name}
									</span>
									<span aria-hidden>·</span>
									<time dateTime={data.createdAt}>
										{formatDate(data.createdAt)}
									</time>
									{data.locked && (
										<span
											className="text-xs px-2 py-0.5 rounded-full font-medium"
											style={{
												backgroundColor: "rgba(22,101,52,0.12)",
												color: "#166534",
											}}
										>
											답변 완료 · 수정 불가
										</span>
									)}
								</div>
								<div
									className="mt-4 w-full rounded-lg border whitespace-pre-wrap box-border"
									style={{
										fontFamily: typography.fontFamily,
										color: "#374151",
										fontSize: "clamp(0.8125rem, 0.45vw + 0.72rem, 0.9375rem)",
										lineHeight: 1.65,
										minHeight: "max(14rem, min(25vh, 26rem))",
										padding: "clamp(1rem, 2.2vw, 1.75rem)",
										backgroundColor: "rgba(249, 250, 251, 0.98)",
										borderColor: colors.border,
									}}
								>
									{data.content}
								</div>
							</div>
						</div>
					</div>

					{/* 답변 영역 (같은 카드 안, 구분선) */}
					<div className="border-t" style={{ borderColor: colors.border }}>
						<div
							className="px-4 py-3 md:px-6 flex items-center gap-2"
							style={{ backgroundColor: "rgba(243,244,246,0.65)" }}
						>
							<MessageSquare
								size={18}
								strokeWidth={2}
								style={{ color: colors.secondaryText }}
							/>
							<h2
								className="text-sm font-semibold"
								style={{ fontFamily: typography.fontFamily }}
							>
								답변
							</h2>
							<span
								className="text-xs px-2 py-0.5 rounded-full font-medium"
								style={{
									backgroundColor: colors.border,
									color: colors.primaryText,
								}}
							>
								{replyCount}
							</span>
						</div>

						<div className="p-4 md:px-6 md:pb-6 pt-2 space-y-0">
							{data.replies.length === 0 ? (
								<p
									className="text-center text-sm py-10"
									style={{ color: colors.secondaryText }}
								>
									아직 답변이 없습니다. 관리자가 답변을 남기면 여기에
									표시됩니다.
								</p>
							) : (
								<ul className="space-y-5">
									{data.replies.map((r: InquiryReply) => (
										<li key={r.id} className="flex gap-3">
											<UserAvatar name={r.author.name} size={36} bg="#0d9488" />
											<div className="flex-1 min-w-0">
												{editingReplyId === r.id ? (
													<div className="space-y-2">
														<textarea
															className="w-full border rounded-lg p-2 resize-y"
															style={{
																...formFieldLightStyle,
																minHeight: 56,
																fontSize:
																	"clamp(0.75rem, 0.35vw + 0.62rem, 0.8125rem)",
																lineHeight: 1.5,
															}}
															value={editingText}
															onChange={(e) => setEditingText(e.target.value)}
														/>
														<div
															className="flex gap-1.5 flex-wrap"
															style={{ marginBottom: "0.75rem" }}
														>
															<Button
																variant="primary"
																type="button"
																style={{
																	padding: "5px 12px",
																	fontSize: "12px",
																}}
																onClick={() => handleSaveEditReply(r.id)}
															>
																저장
															</Button>
															<Button
																variant="secondary"
																type="button"
																style={{
																	padding: "5px 12px",
																	fontSize: "12px",
																}}
																onClick={() => setEditingReplyId(null)}
															>
																취소
															</Button>
														</div>
													</div>
												) : (
													<>
														<div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
															<span
																className="text-sm font-semibold"
																style={{ color: colors.primaryText }}
															>
																{r.author.name}
															</span>
															<span
																className="text-[10px] uppercase tracking-wide px-1.5 py-px rounded font-semibold"
																style={{
																	backgroundColor: "rgba(13,148,136,0.15)",
																	color: "#0f766e",
																}}
															>
																관리자
															</span>
															<time
																className="text-xs"
																style={{ color: colors.secondaryText }}
																dateTime={r.createdAt}
															>
																{formatDate(r.createdAt)}
																{r.updatedAt !== r.createdAt && " · 수정됨"}
															</time>
														</div>
														<div
															className="mt-2 rounded-2xl rounded-tl-md px-4 py-3 leading-relaxed whitespace-pre-wrap"
															style={{
																backgroundColor: "rgba(241,245,249,0.95)",
																border: `1px solid ${colors.border}`,
																color: "#1e293b",
																fontFamily: typography.fontFamily,
																fontSize:
																	"clamp(0.98rem, 1vw + 0.5rem, 1.2rem)",
															}}
														>
															{r.content}
														</div>
														{isAdmin && user && r.author.id === user.id && (
															<div className="flex gap-2 mt-2">
																<button
																	type="button"
																	className="text-xs font-medium underline-offset-2 hover:underline"
																	style={{ color: colors.secondaryText }}
																	onClick={() => {
																		setEditingReplyId(r.id);
																		setEditingText(r.content);
																	}}
																>
																	수정
																</button>
																<button
																	type="button"
																	className="text-xs font-medium underline-offset-2 hover:underline"
																	style={{ color: "#b91c1c" }}
																	onClick={() => handleDeleteReply(r.id)}
																>
																	삭제
																</button>
															</div>
														)}
													</>
												)}
											</div>
										</li>
									))}
								</ul>
							)}

							{/* 관리자 작성창: 스레드 하단 고정 느낌 */}
							{isAdmin && (
								<div
									className="mt-8 pt-6 border-t flex gap-3"
									style={{ borderColor: colors.border }}
								>
									<div className="hidden sm:block flex-shrink-0">
										<UserAvatar
											name={user?.name ?? "나"}
											size={28}
											bg="#6366f1"
										/>
									</div>
									<div className="flex-1 min-w-0 space-y-1.5">
										<label htmlFor="reply-composer" className="sr-only">
											답변 작성
										</label>
										<textarea
											id="reply-composer"
											rows={2}
											className="w-full border rounded-lg p-2 resize-y placeholder:text-slate-400"
											style={{
												...formFieldLightStyle,
												minHeight: "max(52px, min(7vh, 72px))",
												fontSize:
													"clamp(0.75rem, 0.35vw + 0.62rem, 0.8125rem)",
												lineHeight: 1.5,
											}}
											placeholder="답변을 입력하세요. 등록 후에도 수정할 수 있습니다."
											value={replyBody}
											onChange={(e) => setReplyBody(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
													e.preventDefault();
													if (replyBody.trim()) handleSubmitReply();
												}
											}}
										/>
										<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
											<span
												className="text-xs order-2 sm:order-1"
												style={{ color: colors.secondaryText }}
											>
												Ctrl+Enter로 등록
											</span>
											<Button
												className="order-1 sm:order-2 self-end sm:self-auto"
												variant={replyBody.trim() ? "primary" : "disabled"}
												type="button"
												style={{ padding: "5px 12px", fontSize: "12px" }}
												onClick={handleSubmitReply}
											>
												답변 등록
											</Button>
										</div>
									</div>
								</div>
							)}
						</div>
					</div>
				</article>
			</div>
		</div>
	);
}
