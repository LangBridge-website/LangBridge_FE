import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { UserProvider } from './contexts/UserContext';
import { SidebarProvider } from './contexts/SidebarContext';
import { Layout } from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import { colors } from './constants/designTokens';
import './App.css';

const Home = lazy(() => import('./pages/Home'));
const Translation = lazy(() => import('./pages/Translation'));
const WebPageEditor = lazy(() => import('./pages/WebPageEditor'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const TranslationGuide = lazy(() => import('./pages/TranslationGuide'));
const NewTranslation = lazy(() => import('./pages/NewTranslation'));
const TranslationsPending = lazy(() => import('./pages/TranslationsPending'));
const Documents = lazy(() => import('./pages/Documents'));
const DocumentDetail = lazy(() => import('./pages/DocumentDetail'));
const TranslationWork = lazy(() => import('./pages/TranslationWork'));
const TranslationsWorking = lazy(() => import('./pages/TranslationsWorking'));
const Reviews = lazy(() => import('./pages/Reviews'));
const DocumentReview = lazy(() => import('./pages/DocumentReview'));
const CreationKrPublishPreview = lazy(
	() => import('./pages/CreationKrPublishPreview'),
);
const PublishList = lazy(() => import('./pages/PublishList'));
const TranslationsFavorites = lazy(() => import('./pages/TranslationsFavorites'));
const SystemSettings = lazy(() => import('./pages/SystemSettings'));
const Glossary = lazy(() => import('./pages/Glossary'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const TranslationsHandover = lazy(() => import('./pages/TranslationsHandover'));
const InquiryList = lazy(() => import('./pages/InquiryList'));
const InquiryDetail = lazy(() => import('./pages/InquiryDetail'));
const InquiryForm = lazy(() => import('./pages/InquiryForm'));

function PageLoadingFallback() {
	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				minHeight: '40vh',
				color: colors.secondaryText,
				fontSize: '14px',
			}}
		>
			페이지를 불러오는 중…
		</div>
	);
}

function LazyPage({ children }: { children: ReactNode }) {
	return <ErrorBoundary>{children}</ErrorBoundary>;
}

const Activity = () => (
	<div className="p-8">
		<h1 className="text-2xl font-bold">내 활동</h1>
	</div>
);

function App() {
	return (
		<ErrorBoundary>
			<UserProvider>
				<SidebarProvider>
					<Router>
						<Routes>
							<Route
								path="/"
								element={
									<Suspense fallback={<PageLoadingFallback />}>
										<LazyPage>
											<Home />
										</LazyPage>
									</Suspense>
								}
							/>

							<Route
								path="/*"
								element={
									<Layout>
										<Suspense fallback={<PageLoadingFallback />}>
											<ErrorBoundary>
												<Routes>
													<Route
														path="/translate"
														element={
															<LazyPage>
																<Translation />
															</LazyPage>
														}
													/>
													<Route
														path="/editor"
														element={
															<LazyPage>
																<WebPageEditor />
															</LazyPage>
														}
													/>
													<Route
														path="/dashboard"
														element={
															<LazyPage>
																<Dashboard />
															</LazyPage>
														}
													/>
													<Route
														path="/translation-guide"
														element={
															<LazyPage>
																<TranslationGuide />
															</LazyPage>
														}
													/>
													<Route
														path="/translations/pending"
														element={
															<LazyPage>
																<TranslationsPending />
															</LazyPage>
														}
													/>
													<Route
														path="/translations/:id/work"
														element={
															<LazyPage>
																<TranslationWork />
															</LazyPage>
														}
													/>
													<Route
														path="/translations/working"
														element={
															<LazyPage>
																<TranslationsWorking />
															</LazyPage>
														}
													/>
													<Route
														path="/translations/favorites"
														element={
															<LazyPage>
																<TranslationsFavorites />
															</LazyPage>
														}
													/>
													<Route
														path="/documents"
														element={
															<LazyPage>
																<Documents />
															</LazyPage>
														}
													/>
													<Route
														path="/documents/handovers"
														element={
															<LazyPage>
																<TranslationsHandover />
															</LazyPage>
														}
													/>
													<Route
														path="/documents/:id"
														element={
															<LazyPage>
																<DocumentDetail />
															</LazyPage>
														}
													/>
													<Route
														path="/translations/new"
														element={
															<LazyPage>
																<NewTranslation />
															</LazyPage>
														}
													/>
													<Route
														path="/reviews"
														element={
															<LazyPage>
																<Reviews />
															</LazyPage>
														}
													/>
													<Route
														path="/reviews/:id/review"
														element={
															<LazyPage>
																<DocumentReview />
															</LazyPage>
														}
													/>
													<Route
														path="/reviews/:id/publish"
														element={
															<LazyPage>
																<CreationKrPublishPreview />
															</LazyPage>
														}
													/>
													<Route
														path="/publish"
														element={
															<LazyPage>
																<PublishList />
															</LazyPage>
														}
													/>
													<Route
														path="/inquiries"
														element={
															<LazyPage>
																<InquiryList />
															</LazyPage>
														}
													/>
													<Route
														path="/inquiries/new"
														element={
															<LazyPage>
																<InquiryForm />
															</LazyPage>
														}
													/>
													<Route
														path="/inquiries/:id/edit"
														element={
															<LazyPage>
																<InquiryForm />
															</LazyPage>
														}
													/>
													<Route
														path="/inquiries/:id"
														element={
															<LazyPage>
																<InquiryDetail />
															</LazyPage>
														}
													/>
													<Route
														path="/glossary"
														element={
															<LazyPage>
																<Glossary />
															</LazyPage>
														}
													/>
													<Route
														path="/users"
														element={
															<LazyPage>
																<UserManagement />
															</LazyPage>
														}
													/>
													<Route
														path="/activity"
														element={
															<LazyPage>
																<Activity />
															</LazyPage>
														}
													/>
													<Route
														path="/settings"
														element={
															<LazyPage>
																<SystemSettings />
															</LazyPage>
														}
													/>
												</Routes>
											</ErrorBoundary>
										</Suspense>
									</Layout>
								}
							/>
						</Routes>
					</Router>
				</SidebarProvider>
			</UserProvider>
		</ErrorBoundary>
	);
}

export default App;
