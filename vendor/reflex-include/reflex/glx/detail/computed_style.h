#pragma once

#include "../style/style.h"
#include "layer.h"




//
//declarations

REFLEX_NS(Reflex::GLX::Detail)

using LayerList = Array < ConstReference <Layer> >;

using LayerWithState = Tuple < const Layer*, Reference <Reflex::Object>, Reference <Graphic> >;

class ComputedStyle;

REFLEX_END




//
//Detail::ComputedStyle

class Reflex::GLX::Detail::ComputedStyle : public Reflex::Object
{
public:

	static ComputedStyle & null;

	enum Property : UInt8
	{
		kPropertyZIndex,
		kPropertyMargin,
		kPropertyPadding,
		kPropertyMin,
		kPropertyMax,
		kPropertyOpacity,
		kPropertyScale,
		kPropertyRenderSettings,	//render, density, padding
		kPropertyBackgroundLayers,
		kPropertyForegroundLayers,
		kPropertyBackgroundColor,
		kPropertyAspectRatio,
	};

	enum Render : UInt8
	{
		kRenderAuto,
		kRenderTrue,
		kRenderX2,
		kRenderX4,
		kRenderX8,
		kRenderX16,
		kRenderFalse,//last to allow manual override of render to texture

		kNumRender,
	};



	//lifetime

	[[nodiscard]] static TRef <ComputedStyle> Create(const Style & root, const Data::PropertySet & properties);

	[[nodiscard]] static inline TRef <ComputedStyle> Create(const Style & style) { return Create(style, style); }

	[[nodiscard]] static TRef <ComputedStyle> Create(Size min, Size max); 	//for SetBounds

	[[nodiscard]] static TRef <ComputedStyle> Create(bool clipx, bool clipy); 	//for SetClip

	[[nodiscard]] static TRef <ComputedStyle> Create(Float scale, Float opacity, Render render); 	//for SetOpacity & SetMagnification



	//properties

	Int8 GetZIndex() const;

	Pair <bool> GetClip() const { return m_clip; }

	const Margin & GetMargin() const;

	const Margin & GetPadding() const;

	const Pair <Size> & GetMinMax() const;

	Float GetHeightRatio() const;

	Float GetScale() const;

	Float GetOpacity() const;

	const Colour & GetBackgroundColour() const;


	Render GetRender() const;

	const Margin & GetRenderPadding() const;


	Float GetTransitionTime() const;



	//flags

	UInt16 GetPropertyFlags() const { return m_propertyflags.GetWord(); }

	UInt8 GetLayoutFlags() const { return m_layoutflags.GetWord(); }



	//

	virtual TRef <ComputedStyle> Mutate(const ComputedStyle & b) const = 0;

	virtual TRef <GLX::Core::Renderer> CreateRenderer(GLX::Object & object) const = 0;



protected:

	ComputedStyle();


	Margin m_margin, m_padding;

	Pair <Size> m_minmax;

	Float m_opacity;

	Float m_scale;

	Int8 m_zindex;

	Pair <bool> m_clip;

	Render m_render;

	Margin m_render_pad;		//in future automatically deduce from layers?

	Colour m_colour = kWhite;

	Colour m_background_colour;


	Float m_height_ratio;

	Float m_transition;

	Flags16 m_propertyflags;

	Flags8 m_layoutflags;

	Flags8 m_renderflags;

	bool m_compile_renderflags = false;

	UInt8 m_layermorph = false;

	mutable TRef <Core::Renderer> m_renderer;

	LayerList m_layers[2];


	UIntNative m_layersource[2] = { 0,0 };
};

REFLEX_SET_TRAIT(Reflex::GLX::Detail::ComputedStyle, IsSingleThreadExclusive)




//
//impl

REFLEX_INLINE const Reflex::GLX::Margin & Reflex::GLX::Detail::ComputedStyle::GetMargin() const
{
	return m_margin;
}

REFLEX_INLINE const Reflex::GLX::Margin & Reflex::GLX::Detail::ComputedStyle::GetPadding() const
{
	return m_padding;
}

REFLEX_INLINE const Reflex::Pair <Reflex::GLX::Size> & Reflex::GLX::Detail::ComputedStyle::GetMinMax() const
{
	return m_minmax;
}

REFLEX_INLINE Reflex::Float Reflex::GLX::Detail::ComputedStyle::GetHeightRatio() const
{
	return m_height_ratio;
}

REFLEX_INLINE Reflex::Float Reflex::GLX::Detail::ComputedStyle::GetOpacity() const
{
	return m_opacity;
}

REFLEX_INLINE Reflex::Float Reflex::GLX::Detail::ComputedStyle::GetScale() const
{
	return m_scale;
}

REFLEX_INLINE Reflex::Int8 Reflex::GLX::Detail::ComputedStyle::GetZIndex() const
{
	return m_zindex;
}

REFLEX_INLINE const Reflex::GLX::Colour & Reflex::GLX::Detail::ComputedStyle::GetBackgroundColour() const
{
	return m_background_colour;
}

REFLEX_INLINE Reflex::GLX::Detail::ComputedStyle::Render Reflex::GLX::Detail::ComputedStyle::GetRender() const
{
	return m_render;
}

REFLEX_INLINE const Reflex::GLX::Margin & Reflex::GLX::Detail::ComputedStyle::GetRenderPadding() const
{
	return m_render_pad;
}

REFLEX_INLINE Reflex::Float Reflex::GLX::Detail::ComputedStyle::GetTransitionTime() const
{
	return m_transition;
}
