#pragma once

#include "abstract_viewbar.h"




//
//Primary API

namespace Reflex::GLX
{

	class AbstractViewPort;


	class Scroller;

	class Zoomable;

}




//
//AbstractViewPort

class Reflex::GLX::AbstractViewPort : public Object
{
public:

	REFLEX_OBJECT(GLX::AbstractViewPort,Object);

	static AbstractViewPort & null;



	//types

	struct Coordinates;

	using ViewBarCtr = FunctionPointer <TRef<AbstractViewBar>(AbstractViewPort&)>;



	//standard viewbars

	static const ViewBarCtr kNullBar, kScrollBar, kZoomBar;



	//lifetime

	~AbstractViewPort();



	//setup

	void SetViewBarCtr(bool y, ViewBarCtr ctr);

	void InvertScrollAxis(bool enable = true);



	//content

	void SetContent(TRef <Object> content, Key32 style_id = kcontent);

	TRef <Object> GetContent();

	ConstTRef <Object> GetContent() const { return *RemoveConst(this)->GetContent(); }



	//visible area

	[[nodiscard]] TRef <Reflex::Object> CreateListener(const Function <void()> & callback);


	void SetMinViewRange(Size size);

	Size GetMinViewRange() const;


	Size GetTotalViewRange() const;


	void SetView(const Rect & view);

	const Rect & GetView() const;


	Size GetPixelSize() const;



	//scroll

	void StartScroll(bool yaxis, Float offset);

	void StopScroll(bool yaxis);


	void Reveal(bool yaxis, Float offset, Float range, Float padding, bool animate = true);


	void EnableAutoScroll(Float amount = 0.95f, bool scoped = false);

	void DisableAutoScroll();



	//components

	ConstTRef <Object> GetBody() const;

	TRef <AbstractViewBar> GetViewBar(bool y);



	//info

	const bool zoomable;

	const Pair <bool> inverted;



	//coordinates

	const TRef <Coordinates> coordinates;



protected:

	AbstractViewPort(bool zoomable);

	void InvertAxis(bool invertx, bool inverty);

	virtual void OnSetStyle(const Style & style) override;

	virtual bool OnEvent(Object & src, Event & e) override;

	virtual void OnFocus() override;



public: //TODO merge & cleanup
	
	struct Impl { UInt8 bytes[576]; } m_impl;	//TODO / TRANSTIONAL move to protected, and merge View with AbstractViewPort

};

REFLEX_SET_TRAIT(Reflex::GLX::AbstractViewPort, IsSingleThreadExclusive);




//
//Scroller

class Reflex::GLX::Scroller : public AbstractViewPort
{
public:

	REFLEX_OBJECT(GLX::Scroller, AbstractViewPort);

	static Scroller & null;

	Scroller();

};

REFLEX_SET_TRAIT(Reflex::GLX::Scroller, IsSingleThreadExclusive);




//
//Zoomable

class Reflex::GLX::Zoomable : public AbstractViewPort
{
public:

	REFLEX_OBJECT(GLX::Zoomable, AbstractViewPort);

	static Zoomable & null;

	Zoomable();

	[[deprecated]] Zoomable(bool invertx, bool inverty);

	using AbstractViewPort::InvertAxis;

};
	
REFLEX_SET_TRAIT(Reflex::GLX::Zoomable, IsSingleThreadExclusive);


	

//
//impl

struct Reflex::GLX::AbstractViewPort::Coordinates :
	public Reflex::Object,
	public Reflex::State,
	public Signal <>
{
	static Coordinates & null;

	Coordinates(AbstractViewPort & owner);

	virtual void SetMinViewRange(const Size & size) = 0;

	virtual Size GetMinViewRange() const = 0;

	virtual Size GetTotalViewRange() const = 0;

	virtual void SetView(const Rect & view) = 0;

	virtual const Rect & GetView() const = 0;

	virtual const Size & GetPixelSize() const = 0;

	const TRef <AbstractViewPort> owner;
};

REFLEX_SET_TRAIT(Reflex::GLX::AbstractViewPort::Coordinates, IsSingleThreadExclusive);

inline void Reflex::GLX::AbstractViewPort::SetMinViewRange(Size size)
{
	coordinates->SetMinViewRange(size);
}

inline Reflex::GLX::Size Reflex::GLX::AbstractViewPort::GetMinViewRange() const
{
	return coordinates->GetMinViewRange();
}

inline Reflex::GLX::Size Reflex::GLX::AbstractViewPort::GetTotalViewRange() const
{
	return coordinates->GetTotalViewRange();
}

inline void Reflex::GLX::AbstractViewPort::SetView(const Rect & view)
{
	coordinates->SetView(view);
}

inline const Reflex::GLX::Rect & Reflex::GLX::AbstractViewPort::GetView() const
{
	return coordinates->GetView();
}

inline Reflex::GLX::Size Reflex::GLX::AbstractViewPort::GetPixelSize() const
{
	return coordinates->GetPixelSize();
}

inline Reflex::GLX::Scroller::Scroller()
	: AbstractViewPort(false)
{
}

inline Reflex::GLX::Zoomable::Zoomable()
	: AbstractViewPort(true)
{
}

inline Reflex::GLX::Zoomable::Zoomable(bool invertx, bool inverty)
	: AbstractViewPort(true)
{
	InvertAxis(invertx, inverty);
}
