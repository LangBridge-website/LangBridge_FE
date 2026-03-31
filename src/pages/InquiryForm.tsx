import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
	colors,
	formFieldLightStyle,
	typography,
} from "../constants/designTokens";
import { Button } from "../components/Button";
import { inquiryApi } from "../services/inquiryApi";
import { dispatchInquiryBadgeRefresh } from "../hooks/useInquiryBadge";

export default function InquiryForm() {
	const { id } = useParams<{ id: string }>();
	const isEdit = Boolean(id);
	const inquiryId = id ? Number(id) : Number.NaN;
	const navigate = useNavigate();

	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");
	const [loading, setLoading] = useState(isEdit);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!isEdit || !Number.isFinite(inquiryId)) return;
		let cancelled = false;
		(async () => {
			setLoading(true);
			try {
				const d = await inquiryApi.getDetail(inquiryId, { markRead: false });
				if (cancelled) return;
				if (d.locked) {
					navigate(`/inquiries/${inquiryId}`, { replace: true });
					return;
				}
				setTitle(d.title);
				setContent(d.content);
			} catch {
				if (!cancelled) setError("문의를 불러오지 못했습니다.");
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [isEdit, inquiryId, navigate]);

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		if (!title.trim() || !content.trim()) return;
		setSaving(true);
		setError(null);
		try {
			if (isEdit) {
				await inquiryApi.update(inquiryId, {
					title: title.trim(),
					content: content.trim(),
				});
			} else {
				const created = await inquiryApi.create({
					title: title.trim(),
					content: content.trim(),
				});
				dispatchInquiryBadgeRefresh();
				navigate(`/inquiries/${created.id}`);
				return;
			}
			dispatchInquiryBadgeRefresh();
			navigate(`/inquiries/${inquiryId}`);
		} catch (err: unknown) {
			const msg =
				err && typeof err === "object" && "response" in err
					? (err as { response?: { data?: { error?: string } } }).response?.data
							?.error
					: null;
			setError(msg || "저장에 실패했습니다.");
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<div className="p-8" style={{ color: colors.secondaryText }}>
				불러오는 중…
			</div>
		);
	}

	return (
		<div
			className="min-h-full p-6 md:p-8"
			style={{
				backgroundColor: colors.primaryBackground,
				color: colors.primaryText,
			}}
		>
			<div
				className="mx-auto px-[2vw] sm:px-0"
				style={{ width: "min(92vw, 56rem)", maxWidth: "100%" }}
			>
				<Link
					to={isEdit ? `/inquiries/${inquiryId}` : "/inquiries"}
					className="text-sm"
					style={{ color: colors.secondaryText }}
				>
					← 돌아가기
				</Link>
				<h1
					className="text-xl font-semibold mt-4 mb-6"
					style={{ fontFamily: typography.fontFamily }}
				>
					{isEdit ? "문의 수정" : "문의 작성"}
				</h1>

				{error && (
					<p className="text-sm mb-4" style={{ color: "#b91c1c" }}>
						{error}
					</p>
				)}

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label htmlFor="inquiry-title" className="block text-sm mb-1">
							제목
						</label>
						<input
							id="inquiry-title"
							type="text"
							className="w-full border rounded px-3 py-2 text-sm"
							style={formFieldLightStyle}
							maxLength={500}
							value={title}
							onChange={(e) => setTitle(e.target.value)}
						/>
					</div>
					<div>
						<label htmlFor="inquiry-body" className="block text-sm mb-1">
							내용
						</label>
						<textarea
							id="inquiry-body"
							className="w-full border rounded-lg px-3 py-3 resize-y box-border"
							style={{
								...formFieldLightStyle,
								minHeight: "max(16rem, min(22vh, 36rem))",
								fontSize: "clamp(0.8125rem, 0.45vw + 0.72rem, 0.9375rem)",
								lineHeight: 1.65,
							}}
							value={content}
							onChange={(e) => setContent(e.target.value)}
						/>
					</div>
					<div
						className="flex gap-2 items-center flex-wrap"
						style={{ marginTop: "0.25rem", paddingBottom: "1.5rem" }}
					>
						<Button
							type="submit"
							variant="primary"
							disabled={saving}
							style={{ padding: "5px 12px", fontSize: "12px" }}
						>
							{saving ? "저장 중…" : "저장"}
						</Button>
						<Button
							type="button"
							variant="secondary"
							style={{ padding: "5px 12px", fontSize: "12px" }}
							onClick={() =>
								navigate(isEdit ? `/inquiries/${inquiryId}` : "/inquiries")
							}
						>
							취소
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
}
